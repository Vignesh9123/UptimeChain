import { Router } from "express";
import { getLatestResultsForUser, getWebsiteContinentStatusForRound, getWebsiteResults, getWebsiteSubmissions } from "../controllers/ping.controller"
import { authMiddleware } from "../middlewares";

const router = Router()
router.get("/latest", authMiddleware, getLatestResultsForUser)
router.get("/:websiteId/continent-status", authMiddleware, getWebsiteContinentStatusForRound)
router.get("/:websiteId/submissions", authMiddleware, getWebsiteSubmissions)
router.get("/:websiteId", authMiddleware, getWebsiteResults)
export { router as pingRouter }
