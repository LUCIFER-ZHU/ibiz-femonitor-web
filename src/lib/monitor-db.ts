import { Dexie } from 'dexie';

/**
 * 库实例基类
 *
 * @export
 * @class MonitorDB
 */
export class MonitorDB {

    /**
     * @description 唯一实例
     * @protected
     * @static
     * @type {*}
     * @memberof MonitorDB
     */
    protected static instance: any;

    /**
     * @description 获取实例
     * @static
     * @return {*}  {MonitorDB}
     * @memberof MonitorDB
     */
    static getInstance(): MonitorDB {
        if (!this.instance) {
            this.instance = new MonitorDB();
        }
        return this.instance;
    }

    /**
     * 库
     * @protected
     * @type {Dexie}
     * @memberof MonitorDB
     */
    public db: Dexie;

    /**
     * 当前表
     *
     * @type {Dexie.Table<T, string>}
     */
    public tab: Dexie.Table;    

    /**
     * Creates an instance of MonitorDB.
     * @memberof MonitorDB
     */
    constructor() {
      this.init();
    }

    /**
     * @description 数据库初始化
     * @protected
     * @memberof MonitorDB
     */
    protected init(): void {
      // 创建名为 MonitorDB 的数据库
      this.db = new Dexie('MonitorDB');      
      // 创建表    
      this.db.version(1).stores({
        docMessage: `&++msgId,msg,stackTrace,mapStackTrace,errorType,status,createTime,updateTime`          
      });
      this.tab = this.db.table('docMessage');
    }

    /**
     * @description 添加一条消息记录
     * @protected
     * @memberof MonitorDB
     */    
    async addMessage(msg:any) {
      const time = new Date().getTime();
      try {
        let r = await this.tab.add({
          ...msg,
          status: 0,
          createTime: time,
          updateTime: time
        })
        console.log('db-save', r);
      } catch (err) {
        console.error(err)
      }
    }

    /**
     * @description 删除一条消息记录
     * @protected
     * @memberof MonitorDB
     */        
    async deleteMessageByMsgId(msgId:any) {
      try {
        await this.tab.where({ msgId }).delete()
      } catch (err) {
        console.error(err)
      }
    }

    /**
     * @description 删除多条消息记录
     * @protected
     * @memberof MonitorDB
     */ 
    async deleteMessagesByMsgIds(msgIds:any[]) {
      try {
        await this.tab
          .where('msgId')
          .anyOf(msgIds)
          .delete()
      } catch (err) {
        console.error(err)
      }
    }
   
    /**
     * @description 更新一条消息的状态
     * @protected
     * @memberof MonitorDB
     */    
    async updateMessageStatus(msgId:any, status:any) {
      const time = new Date().getTime();
      try {
        await this.tab
          .where('msgId')
          .equals(msgId)
          .modify({
            status,
            updateTime: time
          })
      } catch (err) {
        console.error(err)
      }
    }

    /**
     * @description 更新多条消息的状态
     * @protected
     * @memberof MonitorDB
     */      
    async updateMessagesStatus(msgIds:any[], status:any) {
      const time = new Date().getTime()
      try {
        await this.tab
          .where('msgId')
          .anyOf(msgIds)
          .modify({
            status,
            updateTime: time
          })
      } catch (err) {
        console.error(err)
      }
    }

    /**
     * @description 根据搜索条件查询某时间段内某文档的所有消息
     * @protected
     * @memberof MonitorDB
     */        
    async filterMessagesByMsgObj(msgObj:{[key: string]: any}, startTime:any, endTime:any) {
      let messages = []
      try {
        messages = await this.tab
          .where(msgObj)
          .and((item) => item.createTime < endTime && item.createTime > startTime) // 也可以使用 above 和 below
          .toArray()
      } catch (err) {
        console.error(err)
      }
      return messages
    }

    /**
     * @description 根据搜索条件查询某文档的所有消息
     * @protected
     * @memberof MonitorDB
     */     
    async getAllMessagesByMsgObj(msgObj:{[key: string]: any}) {
      let messages:any = []
      try {
        messages = this.tab.where(msgObj).sortBy('createTime')
      } catch (err) {
        console.error(err)
      }
      return messages
    }

    /**
     * @description 根据搜索条件查询某文档的所有消息
     * @protected
     * @memberof MonitorDB
     */     
    async getAllMessagesKeysByMsgObj(msgObj:{[key: string]: any}) {
      let tbkeys:any = []
      try {
        tbkeys = this.tab.where(msgObj).primaryKeys()        
        console.log(88,tbkeys);
      } catch (err) {
        console.error(err)
      }
      return tbkeys
    }

    /**
     * @description 查询某文档的所有消息数量
     * @protected
     * @memberof MonitorDB
     */     
     async getAllMessageNumbers() {
      let numbers:any = []
      try {
        numbers = this.tab.count();
      } catch (err) {
        console.error(err)
      }
      return numbers
    }

    /**
     * @description 查询某文档的所有消息
     * @protected
     * @memberof MonitorDB
     */     
     async getAllMessages() {
      let messages:any = []
      try {
        messages = this.tab.toArray();
      } catch (err) {
        console.error(err)
      }
      return messages
    }

    /**
     * @description 清除某文档的所有消息
     * @protected
     * @memberof MonitorDB
     */     
     async clearAllMessages() {
      try {
        this.tab.clear();
        console.log("清除数据库数据")
      } catch (err) {
        console.error(err)
      }
    }


    
}
