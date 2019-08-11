/**
 * 保存上一次给服务器发送的代码，服务器会维护一份一样的数据。 通过比较保存的数据和即将发送的数据，CodeStore避免发送相同的代码前缀部分，减少网络传输
 */
export default class CodeStore {

    public static getInstance(): CodeStore {
        if (this.instance == null) {
            this.instance = new CodeStore();
        }
        return this.instance;
    }
    /**
     * 最多检查的字符数量
     */
    protected static instance: CodeStore;
    private static readonly CHECK_LENGTH = 800;
    private static readonly REDUNDANCY_LENGTH = 10;
    /**
     * 上次的项目，每次打开新项目的时候清空
     */
    private project = "";
    /**
     * 当前项目各个文件的缓存情况
     */
    private store: { [fileID: string]: string } = {};

    protected constructor() {
    }

    /**
     * 获得即将发送内容和上次发送内容开始不同的下标，只发送下标往后的部分，下标本身作为offset参数发送
     *
     * @param fileID  文件id
     * @param content 文件内容
     * @return 内容开始不同的下标
     */
    public getDiffPosition(fileID: string, content: string): number {
        let i = 0;
        if (fileID in this.store) {
            const lastSent = this.store[fileID];
            // lastSent: 1000 -> [201: 1000]
            // content: 1010 -> [201: 1010]
            const initialI = Math.min(lastSent.length - CodeStore.CHECK_LENGTH, content.length - CodeStore.CHECK_LENGTH);
            i = Math.max(0, initialI);
            for (; i < content.length && i < lastSent.length; i++) {
                if (lastSent.charAt(i) !== content.charAt(i)) {
                    break;
                }
            }
            if (i - initialI < 3) {
                // 只匹配了两个或更少的字符
                i = 0;
            }
        }
        return Math.max(0, i - CodeStore.REDUNDANCY_LENGTH);
    }

    /**
     * 发送成功之后，保存
     *
     * @param project 当前项目
     * @param fileID  文件id
     * @param content 文件内容
     */
    public saveLastSent(project: string, fileID: string, content: string) {
        if (this.project == null || this.project !== project) {
            this.project = project;
            this.store = {};
        }
        this.store[fileID] = content;
    }

    /**
     * 删除一个文件的缓存
     *
     * @param project 当前项目
     * @param fileID  文件id
     */
    public invalidateFile(project: string, fileID: string) {
        if (this.project != null && this.project === project) {
            delete this.store[fileID];
        }
    }
}
