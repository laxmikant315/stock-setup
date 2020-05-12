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
    this.router.get("/", async (req: Request, res: Response) => {

      const result = await axios.get('https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100').then(x=>x.data.data.map(x=>x.symbol))
      res.send(result)
    });
   
  }
}

export default HomeController;
