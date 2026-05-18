import { Router } from "express";
import { getDashboardOverviewForUser, getLatestResultsForUser, getWebsiteContinentStatusForRound, getWebsiteResults, getWebsiteSubmissions, verifyRoundDetails } from "../controllers/ping.controller"
import { authMiddleware } from "../middlewares";

const router = Router()
router.get("/overview", authMiddleware, getDashboardOverviewForUser)
router.get("/latest", authMiddleware, getLatestResultsForUser)
router.get("/verify-round", authMiddleware, verifyRoundDetails)
router.get("/:websiteId/continent-status", authMiddleware, getWebsiteContinentStatusForRound)
router.get("/:websiteId/submissions", authMiddleware, getWebsiteSubmissions)
router.get("/:websiteId", authMiddleware, getWebsiteResults)
export { router as pingRouter }
