import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import marketsRouter from "./markets";
import tradingRouter from "./trading";
import blogRouter from "./blog";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(marketsRouter);
router.use(blogRouter);
router.use(tradingRouter);
router.use(adminRouter);

export default router;
