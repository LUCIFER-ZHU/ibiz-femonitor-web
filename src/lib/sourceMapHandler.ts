import sourceMap  from "source-map-js"
import axios from "axios"
import { ITrackerOptions } from "./monitor";

/**
 * 库实例基类
 *
 * @export
 * @class SourceMapHandler
 */
export class SourceMapHandler {

  /**
   * @description 唯一实例
   * @protected
   * @static
   * @type {*}
   * @memberof SourceMapHandler
   */
  protected static instance: any;

  /**
   * @description 传入的配置
   * @protected
   * @static
   * @type {*}
   * @memberof SourceMapHandler
   */  
  public _options;

  constructor(options?: ITrackerOptions) {
    this._options = options;
  }

  /**
   * @description 获取实例
   * @static
   * @return {*}  {SourceMapHandler}
   * @memberof SourceMapHandler
   */
  static getInstance(options?:ITrackerOptions): SourceMapHandler {
    if (!this.instance) {
      this.instance = new SourceMapHandler(options);
    }
    return this.instance;
  }

  /**
   * @description 通过sourceMap找到对应代码
   * @protected
   * @memberof SourceMapHandler
   */
  public async findCodeBySourceMap (stackFrame:any) {
    // stackFrame.fileName 就是报错的Js代码，需要根据这个Js 获取到对应的source-map    
    const fileName = stackFrame.fileName.substring(stackFrame.fileName.lastIndexOf("/")+1);
    const sourceData:any = await this.loadSourceMap(this._options?.sourceMapBaseUrl + fileName + ".map");
    if (sourceData) {
      const fileContent = sourceData.data;
      const consumer = await new sourceMap.SourceMapConsumer(fileContent);
      // 通过报错位置查找到对应的源文件名称以及报错行数
      const lookUpResult = consumer.originalPositionFor({
        line: stackFrame.lineNumber,
        column: stackFrame.columnNumber
      })
      // 那么就可以通过 sourceContentFor 这个方法找到报错的源代码
      const code = consumer.sourceContentFor(lookUpResult.source);
  
      console.log(code, "还原之后的 code")
      return {
        code,
        line: lookUpResult.line,   // 具体的报错行数
        column: lookUpResult.column,  // 具体的报错列数
        sourceName: lookUpResult.source
      }
    } else {
      console.log('没找到map文件');
    }
  }

  /**
   * @description 通过sourceMap找到对应代码
   * @protected
   * @memberof SourceMapHandler
   */  
  public async loadSourceMap(url:any) {
    console.log('mapurl',url);
    return await axios.get(url);
  }


}
