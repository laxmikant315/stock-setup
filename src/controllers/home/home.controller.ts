import * as express from "express";
import { Request, Response } from "express";
import IControllerBase from "interfaces/IControllerBase.interface";
import axios from "axios";

class HomeController implements IControllerBase {

  public router = express.Router();

  constructor() {
    this.initRoutes();

  }
  

  public initRoutes() {
    this.router.get("/", (req: Request, res: Response) => {
      res.send('Welcome')
    });
   
  }
}

export default HomeController;
