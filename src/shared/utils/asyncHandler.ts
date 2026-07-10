import type { NextFunction, Request, Response } from "express";

type AsyncHandlerFn<Req extends Request = Request> = (req: Req, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler<Req extends Request = Request>(fn: AsyncHandlerFn<Req>) {
  return (req: Req, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
