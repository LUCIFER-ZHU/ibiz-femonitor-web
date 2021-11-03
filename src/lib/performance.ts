import { TrackerEvents } from "../types/index";
import { myEmitter } from "./event";
import { getFirstScreenTime } from "./firstScreenRender";

export interface IPerformanceInfo<type> {
  
  /**
   * @description DNS查询耗时
   * @type {type}
   * @memberof IPerformanceInfo
   */
  dnsLkTime: type;

  /**
   * @description TCP链接耗时
   * @type {type}
   * @memberof IPerformanceInfo
   */
  tcpConTime: type;
  /**
   * @description request请求耗时
   * @type {type}
   * @memberof IPerformanceInfo
   */
  reqTime: type;
  /**
   * @description 解析dom树耗时
   * @type {type}
   * @memberof IPerformanceInfo
   */
  domParseTime: type;
  /**
   * @description domready时间
   * @type {type}
   * @memberof IPerformanceInfo
   */
  domReadyTime: type;
  /**
   * @description onload时间
   * @type {type}
   * @memberof IPerformanceInfo
   */
  loadTime: type;
  /**
   * @description 白屏时间
   * @type {type}
   * @memberof IPerformanceInfo
   */
  fpTime: type;
  /**
   * @description 首屏加载时间(单位毫秒)
   * @type {type}
   * @memberof IPerformanceInfo
   */
  fcpTime: type;
}

export class PerformanceObserver {
  private performance: Performance;

  private timingInfo: PerformanceTiming;

  /**
   * @description 首屏绘制结束时间戳
   * @private
   * @type {number}
   * @memberof PerformanceObserver
   */
  private fsrEndTime: number;

  constructor() {
    if (!window.performance || !window.performance.timing) {
      console.warn("Your browser does not suppport performance api.");
      return;
    }
    
    this.performance = window.performance;
    this.timingInfo = this.performance.timing;
  }

  private isDataExist(entry: any): boolean {
    return (
      entry && entry.loadEventEnd && entry.responseEnd && entry.domComplete && this.fsrEndTime
    );
  }

  /**
   * 异步检测performance数据是否完备
   */
  private check() {
    const entry = this.performance.getEntriesByType("navigation")[0];
    if (this.isDataExist(entry)) {
      this.getPerformanceData();
    } else setTimeout(this.check.bind(this), 0);
  }

  /**
   * @description 获取性能监控数据
   * @private
   * @memberof PerformanceObserver
   */
  private getPerformanceData() {
    const {
      domainLookupEnd,
      domainLookupStart,
      connectEnd,
      connectStart,
      responseEnd,
      requestStart,
      domComplete,
      domInteractive,
      domContentLoadedEventEnd,
      loadEventEnd,
      navigationStart,
      responseStart,
      fetchStart
    } = this.timingInfo;

    // DNS查询耗时
    const dnsLkTime = domainLookupEnd - domainLookupStart;
    // TCP链接耗时
    const tcpConTime = connectEnd - connectStart;
    // request请求耗时
    const reqTime = responseEnd - requestStart;
    // 解析dom树耗时
    const domParseTime = domComplete - domInteractive;
    // domready时间
    const domReadyTime = domContentLoadedEventEnd - fetchStart;
    // onload时间
    const loadTime = loadEventEnd - navigationStart;
    // 白屏时间
    const fpTime = responseStart - fetchStart;
    // 首屏加载时间
    const fcpTime = this.fsrEndTime;

    const performanceInfo: IPerformanceInfo<number> = {
      dnsLkTime,
      tcpConTime,
      reqTime,
      domParseTime,
      domReadyTime,
      loadTime,
      fpTime,
      fcpTime
    };

    myEmitter.customEmit(TrackerEvents.performanceInfoReady, performanceInfo);
  }

  init(): void {
    this.check();
    getFirstScreenTime().then((fsrEndTime: number)=>{ this.fsrEndTime = fsrEndTime;
      console.log("getFirstScreenTime:::",fsrEndTime)
    })
  }
}

