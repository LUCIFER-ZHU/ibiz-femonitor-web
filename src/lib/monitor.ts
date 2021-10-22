import merge from "deepmerge";
import { myEmitter } from "./event";
import {
  ErrorObserver,
  IError,
  IUnHandleRejectionError
} from "./errorObserver";
import { ISimpleVueError, IVueError } from "./vueErrorObserver";
import { AjaxInterceptor } from "./ajaxInterceptor";
import { VueErrorObserver } from "./vueErrorObserver";
import { FetchInterceptor } from "./fetchInterceptor";
import { IPerformanceInfo, PerformanceObserver } from "./performance";
import {
  BehaviorCombine,
  BehaviorObserver,
  IClickBehavior,
  IConsoleBehavior
} from "./behaviorObserver";
import { getDeviceInfo, IDeviceInfo } from "./device";
import { Reporter } from "./report";
import { TrackerEvents, IHttpReqErrorRes } from "../types";
import { isObject, getNetworkType } from "./util";
import packageJson from "../../package.json";
import { SpaHandler } from "./spaHandler";
import { RrwebObserver } from "./rrwebObserver";
import { eventWithTime } from "rrweb/typings/types";
import stringify from "json-stringify-safe";
import { MonitorDB } from "./monitor-db";
import { SourceMapHandler } from "./sourceMapHandler";

export type ErrorCombine =
  | IError
  | ISimpleVueError
  | IVueError
  | IUnHandleRejectionError
  | IHttpReqErrorRes;

export enum Env {
  Dev = "dev",
  Sandbox = "sandbox",
  Production = "production"
}

export interface IErrorOptions {
  watch: boolean;
  random: number;
  repeat: number;
  delay: number;
  reportNumber: number;
}

export interface IHttpOptions {
  fetch: boolean;
  ajax: boolean;
}

export enum ConsoleType {
  log = "log",
  error = "error",
  warn = "warn",
  info = "info",
  debug = "debug"
}
export interface IBehaviorOption {
  watch: boolean;
  console: ConsoleType[];
  click: boolean;
  queueLimit: number;
}

export interface IRrwebOption {
  watch: boolean;
  queueLimit: number;
  delay: number;
}

export interface ITrackerOptions {
  env: Env;
  error: IErrorOptions;
  http: IHttpOptions;
  data: IData;
  reportUrl: string;
  performance: boolean;
  isSpa: boolean;
  behavior: IBehaviorOption;
  rrweb: IRrwebOption;
  sourceMapBaseUrl: string;
}

export type ITrackerOptionsKey = keyof ITrackerOptions;

export type Value = number | string | boolean | undefined;

export interface IConfigDataOptions {
  [key: string]: Value;
}

export type IData = Record<string, unknown>;

// 默认配置
export const defaultTrackerOptions = {
  env: Env.Dev,
  reportUrl: "",
  data: {},
  error: {
    watch: true,
    random: 1,
    repeat: 5,
    delay: 1000,
    reportNumber:1
  },
  performance: false,
  http: {
    fetch: true,
    ajax: true
  },
  behavior: {
    watch: false,
    console: [ConsoleType.error],
    click: true,
    queueLimit: 20
  },
  /**
   * rrweb use mutation observer api, for compatibility see:
   * https://caniuse.com/mutationobserver
   */
  rrweb: {
    watch: false,
    queueLimit: 50,
    delay: 1000
  },
  isSpa: true,
  sourceMapBaseUrl:''
};

export class WebMonitor {
  public static instance: WebMonitor;

  public errObserver: ErrorObserver;

  public ajaxInterceptor: AjaxInterceptor;

  public fetchInterceptor: FetchInterceptor;

  public performanceObserver: PerformanceObserver;

  public spaHandler: SpaHandler;

  public behaviorObserver: BehaviorObserver;

  // 上报器
  public reporter: Reporter;

  // sdk版本号
  public sdkVersion: string;

  // 错误队列
  public errorQueue: ErrorCombine[] = [];

  // 行为队列
  public behaviorQueue: BehaviorCombine[] = [];

  // 记录web行为队列
  public rrwebQueue: eventWithTime[] = [];

  // 默认配置
  private readonly defaultOptions: ITrackerOptions = defaultTrackerOptions;

  // 数据
  public $data: IData = {};

  // 配置
  public $options: ITrackerOptions = this.defaultOptions;

  // 错误定时器
  private errorQueueTimer: any | null;

  // 数据库
  public monitorDb:any;

  // souceMap处理器
  public mapHandler:any;

  constructor(options: Partial<ITrackerOptions> | undefined) {
    this.initOptions(options);

    this.getDeviceInfo();
    this.getNetworkType();
    this.getUserAgent();

    this.initGlobalData();
    this.initInstances();
    this.initEventListeners();
    this.initMonitorDb();
    this.initsouceMapHandler();
  }

  /**
   * 初始化tracker实例，单例
   * @param options ITrackerOptions
   */
  static init(options: Partial<ITrackerOptions> | undefined = {}) {
    if (!this.instance) {
      this.instance = new WebMonitor(options);
    }

    return this.instance;
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo(): void {
    const deviceInfo = getDeviceInfo();

    Object.keys(deviceInfo).forEach((key) => {
      this.configData({
        [`_${key}`]: deviceInfo[key as keyof IDeviceInfo]
      });
    });
  }

  /**
   * 获取网络类型
   */
  getNetworkType(): void {
    const networkType = getNetworkType();
    this.configData({
      _networkType: networkType
    });
  }

  /**
   * 获取用户代理
   */  
  getUserAgent(): void {
    this.configData({
      _userAgent: navigator.userAgent
    });
  }

  /**
   * 初始化配置项
   */
  private initOptions(options: Partial<ITrackerOptions> | undefined): void {
    if (!options) options = {};

    this.$options = merge(this.$options, options);
  }

  /**
   * 初始化全局数据
   */  
  private initGlobalData(): void {
    this.configData({
      _sdkVersion: packageJson.version,
      _env: this.$options.env,
      ...this.$options.data
    });
  }

  /**
   * Inject instances and init
   */
  initInstances(): void {
    this.reporter = new Reporter(this.$options, this.$data);

    if (this.$options.error.watch) {
      this.errObserver = new ErrorObserver(this.$options);
      this.errObserver.init();
    }

    if (this.$options.performance) {
      this.listenPerformanceInfo();
      this.performanceObserver = new PerformanceObserver();
      this.performanceObserver.init();
    }

    if (this.$options.http.fetch) {
      this.fetchInterceptor = new FetchInterceptor(this.$options);
      this.fetchInterceptor.init();
    }

    if (this.$options.http.ajax) {
      this.ajaxInterceptor = new AjaxInterceptor(this.$options);
      this.ajaxInterceptor.init();
    }

    if (this.$options.behavior.watch) {
      this.listenBehaviors();
      this.behaviorObserver = new BehaviorObserver(this.$options);
      this.behaviorObserver.init();
    }

    if (this.$options.rrweb.watch) {
      this.listenMouseTrack();
      new RrwebObserver().init();
    }

    if (this.$options.isSpa) {
      this.spaHandler = SpaHandler.init();
      myEmitter.on("_spaHashChange", (...rest) => {
        const [, , url] = rest;
        this.configData({
          _spaUrl: url
        });
      });
    }
  }

  /**
   * 监听鼠标轨迹
   */  
  private listenMouseTrack() {
    myEmitter.on(TrackerEvents._mouseTrack, (event: eventWithTime) => {
      if (this.rrwebQueue.length >= this.$options.rrweb.queueLimit) {
        this.rrwebQueue.shift();
      }
      this.rrwebQueue.push(event);

      setTimeout(() => {
        myEmitter.customEmit(TrackerEvents.mouseTrack, this.rrwebQueue);
      }, this.$options.rrweb.delay);
    });
  }

  /**
   * 监听行为
   */  
  private listenBehaviors() {
    myEmitter.on(TrackerEvents._console, (behavior: IConsoleBehavior) => {
      this.pushBehavior(behavior);
      this.configData("_behavior", this.behaviorQueue, false);
    });

    myEmitter.on(TrackerEvents._clickEle, (behavior: IClickBehavior) => {
      this.pushBehavior(behavior);
      this.configData("_behavior", this.behaviorQueue, false);
    });
  }

  /**
   * 监听性能行为
   */  
  private listenPerformanceInfo() {
    myEmitter.on(
      TrackerEvents.performanceInfoReady,
      (performanceInfo: IPerformanceInfo<number>) => {
        this.configData("_performance", stringify(performanceInfo), false);
      }
    );
  }

  /**
   * 插入行为
   */  
  private pushBehavior(behavior: BehaviorCombine) {
    if (this.behaviorQueue.length >= this.$options.behavior.queueLimit) {
      this.behaviorQueue.shift();
    }

    this.behaviorQueue.push(behavior);
  }

  /**
   * 设置全局数据
   */
  configData(
    key: string,
    value: Record<string, unknown> | string | number | Array<any>,
    deepmerge?: boolean
  ): WebMonitor;
  configData(options: Record<string, unknown>, deepmerge?: boolean): WebMonitor;
  configData(
    key: Record<string, unknown> | string,
    value:
      | Record<string, unknown>
      | string
      | number
      | boolean
      | Array<any> = true,
    deepmerge = true
  ): WebMonitor {
    if (typeof key === "string") {
      if (isObject(value) && deepmerge) {
        this.$data = merge(this.$data, value as Record<string, unknown>);
      } else {
        this.$data[key as string] = value;
      }
    } else if (isObject(key)) {
      if (typeof value !== "boolean") {
        throw new Error("deepmerge should be boolean");
      }

      deepmerge = value;
      value = key;
      if (deepmerge) {
        this.$data = merge(this.$data, value);
      } else {
        this.$data = {
          ...this.$data,
          ...value
        };
      }
    }

    myEmitter.emit("_globalDataChange", this.$data);

    return this;
  }

  /**
   * 更改配置
   */  
  public changeOptions(
    key: keyof ITrackerOptions,
    value: ITrackerOptions[keyof ITrackerOptions]
  ): void {
    this.$options = merge(this.$options, {
      [key]: value
    });
  }

  /**
   * 处理错误报告
   */  
  private handleErrorReport(): void {
    if (this.errorQueueTimer) return;

    this.errorQueueTimer = setTimeout(async () => {
      if (this.$options.reportUrl) {
        await this.reporter.reportErrors(this.errorQueue);
      }

      myEmitter.customEmit(TrackerEvents.batchErrors, {
        errorList: this.errorQueue
      });

      this.errorQueueTimer = null;
      this.errorQueue = [];
    }, this.$options.error?.delay);
  }

  /**
   * 初始化事件监听
   */   
  private initEventListeners(): void {
    const errorEvents = [
      TrackerEvents.jsError,
      TrackerEvents.vuejsError,
      TrackerEvents.unHandleRejection,
      TrackerEvents.resourceError,
      TrackerEvents.reqError
    ];

    errorEvents.forEach((eventName) => {
      this.on(eventName, (error) => {
        // Extract sample from all errors
        const random = this.$options.error
          ? this.$options.error?.random
          : this.defaultOptions.error.random;
        const isRandomIgnore = Math.random() >= random;

        if (isRandomIgnore) return;

        this.errorQueue.push(error);
        this.handleErrorReport();
      });
    });
  }

  /**
   * 初始化前端数据库
   */   
  public initMonitorDb(){
    this.monitorDb = MonitorDB.getInstance();
  }

  /**
   * 初始化souceMapHandler
   */   
  public initsouceMapHandler(){
    this.mapHandler = SourceMapHandler.getInstance(this.$options);
  }

  on(event: string | symbol, listener: (...args: any[]) => void): WebMonitor {
    myEmitter.on(event, async (...args) => {
      myEmitter.emit(TrackerEvents._offConsoleTrack);

      await listener(...args);

      myEmitter.emit(TrackerEvents._onConsoleTrack);
    });

    return this;
  }

  once(event: string | symbol, listener: (...args: any[]) => void): WebMonitor {
    myEmitter.once(event, listener);

    return this;
  }

  off(event: string | symbol, listener: (...args: any[]) => void): WebMonitor {
    myEmitter.off(event, listener);

    return this;
  }

  removeAllListeners(event?: string | symbol | undefined): WebMonitor {
    myEmitter.removeAllListeners(event);

    return this;
  }

  emit(event: string | symbol, ...args: any[]): boolean {
    return myEmitter.customEmit(event, ...args);
  }

  useVueErrorListener(Vue: any) {
    new VueErrorObserver(Vue);
  }
}
