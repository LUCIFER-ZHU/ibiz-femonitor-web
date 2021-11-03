import { MonitorDB } from "./monitor-db";

/**
 * @description 用户操作信息
 * @export
 * @interface Operator
 */
export interface Operator {
  /**
   * @description
   * @type {string} 用户id
   * @memberof Operator
   */
  userID?: string;

  /**
   * @description
   * @type {string} 操作时间
   * @memberof Date
   */
  operateDate?: Date;

  /**
   * @description
   * @type {string} 操作时间
   * @memberof Operator
   */
  operateType?: "MANUAL" | "LOGIC";

  /**
   * @description 当前URL路径
   * @type {string}
   * @memberof Operator
   */
  currentLocation?: string;

  /**
   * @description 函数参数集合
   * @type {any[]}
   * @memberof Operator
   */
  fnParams?: any[];

  [propName: string]: any;
}

/**
 * 用户行为监控基类
 *
 * @export
 * @class
 */
export class userActionMonitor {

  /**
   * @description indexDB对象
   * @static
   * @type {MonitorDB}
   * @memberof userActionMonitor
   */
  public static monitorDb: MonitorDB = MonitorDB.getInstance();

  /**
   * @description 当前操作的系统的用户的信息
   * @type {*}
   * @memberof userActionMonitor
   */
  public static user: any;

  /**
   * @description 监控环境信息
   * @static
   * @param {*} user
   * @memberof userActionMonitor
   */
  public static monitorUser(user: any) {
    this.user = user;
    this.saveInfo("user", user);
  }

  /**
   * @description 监控用户操作
   * @static
   * @param {*} user
   * @memberof userActionMonitor
   */
  public static monitorOperator(operator: Operator, operatorType = "MANUAL") {
    operator.userID = this.user.userid;
    operator.operateDate = new Date();
    operator.operatorType = operatorType;
    operator.currentLocation = window.location.href;
    this.saveInfo("operator", operator);
  }

  /**
   * @description 存储监控信息
   * @static
   * @param {*} info
   * @param {string} type
   * @memberof userActionMonitor
   */
  public static saveInfo(type: string, info: any) {
    this.monitorDb.addMessage(info);
    console.log("********UserActionMonitor******\n", type, info);
  }
}
