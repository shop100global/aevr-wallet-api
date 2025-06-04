import User from "../../models/user.model.js";
import pkg from "jsonwebtoken";
import { config } from "dotenv";
import {
  accessTokenData,
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "../../utils/token.js";
import { checkUser, checkUserIsAdmin } from "../../utils/user.js";
import paginateCollection from "../../utils/paginate.js";
import {
  InternalServerError,
  UnauthorizedError,
  NotFoundError,
  BadRequestError,
  ValidationError,
  ErrorHandler,
} from "../../services/error.services.js";
import roleModel from "../../models/role.model.js";
import { logger } from "@untools/logger";
import { WalletService } from "../../services/userWallet.services.js";

const { sign } = pkg;
config();

// Initialize the wallet service with your 100Pay API keys
const walletService = new WalletService(
  process.env.PAY100_PUBLIC_KEY || "",
  process.env.PAY100_SECRET_KEY || ""
);

const userResolvers = {
  User: {
    roles: async (parent, args, context, info) => {
      try {
        const roles = parent.roles;
        if (!roles || roles.length === 0) {
          return [];
        }
        const populatedRoles = await Promise.all(
          roles.map((role) => roleModel.findById(role))
        );
        return populatedRoles;
      } catch (error) {
        console.log("User.roles error", error);
        throw ErrorHandler.handleError(error);
      }
    },
    wallets: async (parent, args, context, info) => {
      try {
        const userId = context?.user?.data?.id;
        if (!userId) throw new Error("User not found");

        const filter = args.filter || {};
        const pagination = args.pagination || {};

        const wallets = await walletService.getFilteredUserWallets({
          filters: { ...filter, userId: parent.id },
          pagination,
        });

        return wallets;
      } catch (error) {
        console.log("Query.wallets error", error);
        throw ErrorHandler.handleError(error);
      }
    },
  },
  Query: {
    users: async (parent, args, context, info) => {
      try {
        await checkUser(context.user?.data?.id);

        const pagination = args.pagination || {};
        const filters = args.filters || {};

        // Build filter object for MongoDB query
        const filterQuery = {};

        // Implement search functionality
        if (filters.search) {
          const searchRegex = new RegExp(filters.search, "i");
          filterQuery["$or"] = [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { email: searchRegex },
            { phone: searchRegex },
          ];
        }

        // Add any other filters as needed
        if (filters.role) {
          filterQuery["roles"] = { $in: [filters.role] };
        }

        if (filters.emailVerified !== undefined) {
          filterQuery["emailVerified"] = filters.emailVerified;
        }

        const paginatedUsers = await paginateCollection(User, pagination, {
          filter: filterQuery,
          populate: "roles",
          sort: args.sort || { by: "createdAt", direction: "desc" },
        });

        return paginatedUsers;
      } catch (error) {
        // Log error but don't expose details to client
        console.log("Query.users error", error);

        // Use the error handler to determine the right error type
        const handledError = ErrorHandler.handleError(error);
        throw handledError;
      }
    },
    user: async (parent, args, context, info) => {
      try {
        const user = await User.findById(args.id).populate("roles");
        if (!user) {
          throw new NotFoundError(`User with ID ${args.id} not found`);
        }
        return user;
      } catch (error) {
        console.log("Query.user error", error);
        throw ErrorHandler.handleError(error);
      }
    },
    me: async (parent, args, context, info) => {
      const id = context?.user?.data?.id;

      if (!id) {
        // ✅ Use appropriate error type instead of generic Error
        throw new UnauthorizedError("Unable to authenticate user");
      }

      try {
        const user = await User.findById(id).populate("roles");
        if (!user) {
          throw new NotFoundError("User profile not found");
        }
        return user;
      } catch (error) {
        console.log("Query.me error", error);
        throw ErrorHandler.handleError(error);
      }
    },
  },
  Mutation: {
    register: async (parent, args, context, info) => {
      try {
        // Validate input
        if (!args.input || !args.input.email || !args.input.password) {
          throw new ValidationError("Email and password are required");
        }

        const user = (await User.registerUser(args.input)).populate("roles");
        return { user };
      } catch (error) {
        console.log("Mutation.register error", error);

        // Handle duplicate email error specifically
        if (error.code === 11000) {
          throw new BadRequestError("Email already in use");
        }

        throw ErrorHandler.handleError(error);
      }
    },
    login: async (parent, args, context, info) => {
      try {
        if (!args.input || !args.input.email || !args.input.password) {
          throw new ValidationError("Email and password are required");
        }

        const user = await User.loginUser(args.input);
        const accessToken = createAccessToken(accessTokenData(user));
        const refreshToken = createRefreshToken({ id: user._id });
        return { accessToken, refreshToken, user };
      } catch (error) {
        console.log("Mutation.login error", error);

        // For login failures, provide a clear but secure message
        if (error.message.includes("Invalid credentials")) {
          throw new UnauthorizedError("Invalid email or password");
        }

        throw ErrorHandler.handleError(error);
      }
    },
    refreshToken: async (parent, { token }, context, info) => {
      try {
        if (!token) {
          throw new ValidationError("Refresh token is required");
        }

        const decoded = verifyRefreshToken(token);
        console.log({ decoded });

        const user = await User.findById(decoded.data.id);
        if (!user) {
          throw new UnauthorizedError("User not found");
        }

        const accessToken = createAccessToken(accessTokenData(user));
        return { accessToken };
      } catch (error) {
        // Specific error handling for token issues
        if (
          error.name === "JsonWebTokenError" ||
          error.name === "TokenExpiredError"
        ) {
          throw new UnauthorizedError("Invalid or expired refresh token");
        }

        throw ErrorHandler.handleError(error);
      }
    },
    updateUser: async (parent, args, context, info) => {
      try {
        const userId = context.user?.data?.id;
        if (!userId) {
          throw new UnauthorizedError("Authentication required");
        }

        const user = await checkUser(userId);
        if (!args.input || Object.keys(args.input).length === 0) {
          throw new BadRequestError("No update data provided");
        }

        const providedId = args.id;

        if (providedId) {
          checkUserIsAdmin(userId);
        }

        const updatedUser = await User.findByIdAndUpdate(
          providedId ? providedId : user.id,
          args.input,
          {
            new: true,
            runValidators: true,
          }
        );

        if (!updatedUser) {
          throw new NotFoundError("User not found");
        }

        return updatedUser;
      } catch (error) {
        console.log("Mutation.updateUser error", error);
        throw ErrorHandler.handleError(error);
      }
    },
    deleteUser: async (parent, args, context, info) => {
      try {
        const id = args.id;
        if (!id) {
          throw new UnauthorizedError("User ID required");
        }

        const userIsAdmin = await checkUserIsAdmin(context?.user?.data?.id);
        if (!userIsAdmin) {
          throw new UnauthorizedError("User is not an admin");
        }
        const user = await User.findById(id);
        // cannot delete admin user
        if (checkUserIsAdmin(user?.id)) {
          throw new UnauthorizedError("Cannot delete admin user");
        }
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
          throw new NotFoundError(`User with ID ${id} not found`);
        }

        return deletedUser;
      } catch (error) {
        console.log("Mutation.deleteUser error", error);
        throw ErrorHandler.handleError(error);
      }
    },
  },
};

export default userResolvers;
