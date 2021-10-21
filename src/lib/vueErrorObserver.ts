import ErrorStackParser from "error-stack-parser";
import stringify from "json-stringify-safe";
import { BaseError, ErrorType, TrackerEvents } from "../types/index";
import { myEmitter } from "./event";
import { MonitorDB } from "./monitor-db";

export interface IVueError extends BaseError {
  info: string | undefined;
  propsData: any;
  componentName: string | undefined;
  msg: string;
  stackTrace: string;
  componentNameTrace: string[];
}

export interface ISimpleVueError extends BaseError {
  msg: string;
  stackTrace: string;
}

export class VueErrorObserver {
  constructor(Vue: any) {
    this.init(Vue);
  }

  init(Vue: any) {
    Vue.config.errorHandler = (err:any, vm:any, info:any) => {
      const stackTrace = err ? ErrorStackParser.parse(err) : [];
      const monitorDb = MonitorDB.getInstance();
      try {
        if (vm) {
          const componentName = this.formatComponentName(vm);
          const componentNameTrace = this.getComponentNameTrace(vm);
          const propsData = vm.$options && vm.$options.propsData;
          const errorObj: IVueError = {
            errorType: ErrorType.vueJsError,
            msg: err.message,
            stackTrace: stringify(stackTrace),
            componentName: componentName,
            propsData: propsData,
            info: info,
            componentNameTrace
          };
          monitorDb.addMessage(errorObj);
          myEmitter.customEmit(TrackerEvents.vuejsError, errorObj);
        } else {
          const errorObj: ISimpleVueError = {
            errorType: ErrorType.vueJsError,
            msg: err.message,
            stackTrace: stringify(stackTrace)
          };
          monitorDb.addMessage(errorObj);
          myEmitter.customEmit(TrackerEvents.vuejsError, errorObj);
        }
      } catch (error:any) {
        throw new Error(error);
      }
    };
  }

  getComponentNameTrace(vm: any) {
    const compTrace = [this.formatComponentName(vm)];
    while (vm.$parent) {
      vm = vm.$parent;
      compTrace.unshift(this.formatComponentName(vm));
    }

    return compTrace;
  }

  formatComponentName(vm: any) {
    try {
      if (vm.$root === vm) return "root";

      const name = vm._isVue
        ? (vm.$options && vm.$options.name) ||
          (vm.$options && vm.$options._componentTag)
        : vm.name;
      return (
        (name ? "component <" + name + ">" : "anonymous component") +
        (vm._isVue && vm.$options && vm.$options.__file
          ? " at " + (vm.$options && vm.$options.__file)
          : "")
      );
    } catch (error:any) {
      throw new Error(error);
    }
  }
}
