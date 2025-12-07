import { Router } from "express";
import { userRouter } from "./user.routes";
import { websiteRouter } from "./website.routes";
const router = Router()

router.use('/users', userRouter)
router.use('/websites', websiteRouter)

export default router