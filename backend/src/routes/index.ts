import { Router } from "express";
import { userRouter } from "./user.routes";
import { websiteRouter } from "./website.routes";
import { pingRouter } from "./ping.routes";
const router = Router()

router.use('/users', userRouter)
router.use('/websites', websiteRouter)
router.use('/ping', pingRouter)

export default router