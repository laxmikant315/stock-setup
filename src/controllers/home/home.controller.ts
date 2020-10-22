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
      .get("https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050")
      .then((x) => x.data.metadata.timeVal)
      .catch((e) => {
        console.log(e);
      });
  };


  getNiftyStocks = async (next50?:boolean) => {
    let url = 'https://www1.nseindia.com/live_market/dynaContent/live_watch/stock_watch/niftyStockWatch.json';
    if(next50){
      url="https://www1.nseindia.com/live_market/dynaContent/live_watch/stock_watch/juniorNiftyStockWatch.json"
    }

    return await axios
      .get(url)
      .then((x) => x.data.data.map((x) => ({ symbol: x.symbol, previousClose: x.previousClose })))
      .catch((e) => {
        console.log('Failed to get nifty stocks', e);
       
      });


  };

  getVolitilityStocks = async (date: string) => {
    const url = `https://archives.nseindia.com/archives/nsccl/volt/CMVOLT_${date}.CSV`
    console.log('url>>>', url)
    const csvStr = await axios.get(
      url
    ).then(x => x.data.toString()).catch((e) => {
      console.log('Failed to get Volitility Stocks', e)
    })

    const result = await csv({
      noheader: true,
      output: "csv"
    })
      .fromString(csvStr);

    const final = result.splice(1, result.length)
    // console.log(final);

    return final

  };

  public initRoutes() {
    this.router.get("/", async (req: Request, res: Response) => {
      try {

        const marginApply = false;
        const previousDay = await this.getLatestDate();

        // const previousDay = "22-Oct-2020 10:42:46";

        let first50 = await this.getNiftyStocks();

         let next50 = await this.getNiftyStocks(true);
      
        let niftyStocks = [...first50,...next50];
        console.log('NiftyStocks',niftyStocks.length)
        niftyStocks = niftyStocks
          .filter(x => x.previousClose >= 50)
          .map(y => y.symbol)

        const dailyVolitilityStocks = await this.getVolitilityStocks(moment(previousDay).format('DDMMYYYY'));

        console.log('dailyVolitilityStocks length', dailyVolitilityStocks.length)


        if (niftyStocks && dailyVolitilityStocks && dailyVolitilityStocks.length) {
          console.log("Nifty Stocks loaded.", niftyStocks, 'Length', niftyStocks.length);



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

          if (marginApply) {
            for (let n of niftyVolatilited) {
              n.margin = margins.find((y) => y.symbol === n[1])?.margin;
            }
            niftyVolatilited = niftyVolatilited.filter((x) => x.margin >= 10);

          }

          console.log("result", niftyVolatilited, "length", niftyVolatilited.length);
          const intradayStocks = niftyVolatilited.map((x) => ({
            symbol: x[1],
            margin: x.margin,
          }));


          let appSettings = await AppSettings.findOne().exec();
          if (niftyStocks && dailyVolitilityStocks) {
            if (!appSettings) {
              appSettings = new AppSettings({ intradayStocks });
              await appSettings.save().catch((error) => console.log('Failed to store data', error));

              console.log("Documents inserted");
            } else {
              const response = await appSettings
                .update({
                  intradayStocks
                })
                .catch((error) => console.log('Failed to store data', error));

              console.log("Documents Updated");
            }
          }




          res.send({intradayStocks});

        } else {

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
