import { Router } from "express";
import { addWebsite, getUserWebsites, getUserWebsite } from "../controllers";
import { authMiddleware } from "../middlewares";

const router = Router();

router.route('/').post(authMiddleware, addWebsite)
router.route('/').get(authMiddleware, getUserWebsites)
router.route('/:id').get(authMiddleware, getUserWebsite)

export {router as websiteRouter}