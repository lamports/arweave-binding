import { Router } from "express";
import { arweaveController } from "../controllers/arweave.controller";
import { borshController } from "../controllers/borsh.controller";
import { indexController } from "../controllers/index.controller";

//export default IndexRoute;

const router = Router();

router.get("/", indexController);
router.get("/arweave", arweaveController);
router.get("/borsh", borshController);

export default router;
