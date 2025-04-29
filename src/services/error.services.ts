export class CustomError extends Error {
    status: number;
  
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
      if (typeof (Error as any).captureStackTrace === 'function') {
        (Error as any).captureStackTrace(this, this.constructor);
      }
    }
  }