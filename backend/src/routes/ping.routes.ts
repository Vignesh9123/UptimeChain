import { Router } from "express";
import { getLatestResultsForUser, getWebsiteResults } from "../controllers/ping.controller"
import { authMiddleware } from "../middlewares";

const router = Router()
router.get("/latest", authMiddleware, getLatestResultsForUser)
router.get("/:websiteId", authMiddleware, getWebsiteResults)
export { router as pingRouter }
