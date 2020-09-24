import * as express from "express";
import { Request, Response } from "express";
import IControllerBase from "interfaces/IControllerBase.interface";
import axios from "axios";
import * as moment from 'moment'
import AppSettings from "../../../models/app-settings";

import * as margins from "./margin.json";
const csv = require("csvtojson");

class HomeController implements IControllerBase {
  public router = express.Router();

  constructor() {
    this.initRoutes();
   
  }
  getLatestDate = async () => {
   return await axios
      .get("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20100")
      .then((x) => x.data.metadata.timeVal)
      .catch((e) => {
        console.log(e);
      });
  };


  getNiftyStocks = async (niftyCount) => {
   return await axios
      .get(`https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20${niftyCount}`)
      .then((x) => x.data.data.map((x) => ({symbol:x.symbol,previousClose:x.previousClose})))
      .catch((e) => {
        console.log('Failed to get nifty stocks',e);
      });
  };

  getVolitilityStocks = async (date:string) => {
    
    const csvStr =  await axios.get(
      `https://archives.nseindia.com/archives/nsccl/volt/CMVOLT_${date}.CSV`
    ).then(x=>x.data.toString()).catch((e)=>{
      console.log('Failed to get Volitility Stocks',e)
    })

    const result =  await csv({
        noheader:true,
        output: "csv"
    })
    .fromString(csvStr);

    const final =result.splice(1,result.length)
    // console.log(final);

    return final
     
  };

  public initRoutes() {
    this.router.get("/", async (req: Request, res: Response) => {
try {
  
  const marginApply = false;
       const previousDay = await this.getLatestDate();

   // const previousDay = "23-Sep-2020 15:33:20";
      let niftyStocks = await this.getNiftyStocks("100");

      niftyStocks=niftyStocks
      .filter(x=>x.previousClose>=100)
      .map(y=>y.symbol)

      const dailyVolitilityStocks =  await this.getVolitilityStocks(moment(previousDay).format('DDMMYYYY'));

     

      if (niftyStocks && dailyVolitilityStocks && dailyVolitilityStocks.length) {
        console.log("Nifty Stocks loaded.", niftyStocks, 'Length',niftyStocks.length);
    
    
    
        let niftyVolatilited = dailyVolitilityStocks.filter((x) =>
        niftyStocks.includes(x[1])
        );
    
        for (const x of niftyVolatilited) {
          x.daily = +x[6] * 100;
        }
    
        const sum = niftyVolatilited.map((x) => x.daily).reduce((x, y) => (x += y));
        console.log("sum", sum);
        const avg = sum / niftyVolatilited.length;
        console.log("avg", avg);
        niftyVolatilited = niftyVolatilited
    
          .filter((x) => x.daily > avg)
          .sort((x, y) => {
            return y.daily - x.daily;
          });

          if(marginApply){
            for (let n of niftyVolatilited) {
              n.margin = margins.find((y) => y.symbol === n[1])?.margin;
            }
             niftyVolatilited = niftyVolatilited.filter((x) => x.margin >= 10);
        
          }
      
        console.log("result", niftyVolatilited , "length",niftyVolatilited.length);
        const intradayStocks = niftyVolatilited.map((x) => ({
          symbol: x[1],
          margin: x.margin,
        }));
    

        let appSettings = await AppSettings.findOne().exec();
      if(niftyStocks && dailyVolitilityStocks ){
      if (!appSettings ) {
        appSettings = new AppSettings({intradayStocks});
        await appSettings.save().catch((error) => console.log('Failed to store data',error));

      console.log("Documents inserted");
      } else {
        const response = await appSettings
          .update({
            intradayStocks
          })
          .catch((error) => console.log('Failed to store data',error));

        console.log("Documents Updated");
      }
      }




      res.send('Task Completed');
      
    }else{

      res.send('Daily Volitality Stocks are not ready yet.');
    }
  }
    catch (error) {
      res.send(error);
    }

     
    });
  }
}

export default HomeController;
