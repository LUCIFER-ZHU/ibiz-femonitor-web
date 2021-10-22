import stringify from "json-stringify-safe";
import { IData, ITrackerOptions } from "./monitor";
import { ErrorCombine } from "./monitor";
import { MonitorDB } from "./monitor-db";

export type ErrorList = Array<ErrorCombine>;

export interface IReportParams {
  errorList: ErrorList;
}

export interface AjaxParams {
  url: string;
  data: any;
}
export class Reporter {
  private _data: IData;

  private _options: any;

  constructor(options: ITrackerOptions, data: IData) {
    this._data = data;
    this._options = options;
  }

  ajax(ajaxParams: AjaxParams): void {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ajaxParams.url, true);
    xhr.setRequestHeader("Content-type", "application/json;charset=UTF-8");
    xhr.send(ajaxParams.data);
  }

  private getReportData(list: any[]) {
    return list.map((item) => {
      Reflect.deleteProperty(item, "context");
      return item;
    });
  }

  async reportErrors(errorList: ErrorList): Promise<void> {
    if (!errorList.length) return;
    const monitorDb = MonitorDB.getInstance();
    const { reportUrl, error} = this._options;
    const reportData = this.getReportData(errorList);
    const reportNumber = error.reportNumber;
    // 如果设置了reportNumber > 1的情况
    if (reportNumber && reportNumber > 1) {
      // 方案1:获取全部存储在数据库的数量
      const messages = await monitorDb.getAllMessages();
      const numbers = await monitorDb.getAllMessageNumbers();
      // 方案2:获取status为0的数量
      // const messages = await monitorDb.getAllMessagesByMsgObj({status:0});
      // const numbers = messages.length;

      // 满足条件上传
      if ( numbers && numbers >= reportNumber) {
        this.ajax({
          url: reportUrl,
          data: stringify(messages)
        });
        // 方案1:上传后清除数据库数据
        await monitorDb.clearAllMessages();

        // 方案2:上传后把status 0=>1
        // const keys = await monitorDb.getAllMessagesKeysByMsgObj({status:0});
        // await monitorDb.updateMessagesStatus(keys,1)        
      }      
    } else {
      this.ajax({
        url: reportUrl,
        data: stringify(reportData)
      });      
    }
  }
}
