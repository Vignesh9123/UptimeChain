import { Router } from "express";
import {getLatestResultsForUser} from "../controllers/ping.controller"
import { authMiddleware } from "../middlewares";

const router = Router()
router.get("/latest", authMiddleware, getLatestResultsForUser)
export {router as pingRouter}
