/**
 * 场景：在 nodejs 运行时里遍历文件目录
 * 同步模式
 * 方案1：递归
 */

/*var fs = require('fs');
var Path = require('path');

function readDirs(path) {
    var result = {  // 构造文件夹数据
        path: path,
        name: Path.basename(path),
        type: 'directory'
    }

    var files = fs.readdirSync(path);  // 拿到文件目录下的所有文件名
    result.children = files.map(function(file) {
        var subPath = Path.resolve(path, file);  // 拼接为绝对路径
        var stats = fs.statSync(subPath);  //拿到文件信息对象
        if(stats.isDirectory()) {  // 判断是否为文件夹类型
            return readDirs(subPath)  // 递归读取文件夹
        }
        return {  // 构造文件数据
            path: subPath,
            name: file,
            type: 'file'
        }
    });
    return result;
}

var cwd = process.cwd();
var tree = readDirs(cwd);
fs.writeFileSync(Path.join(cwd, 'tree.json'), JSON.stringify(tree));*/


// 方案2：循环
/*var fs = require('fs');
var Path = require('path');

function readDirs(path) {
    var result = {
        path: path,
        name: Path.basename(path),
        type: 'directory'
    }
    var stack = [result];
    while(stack.length) {
        var target = stack.pop();
        var files = fs.readdirSync(target.path);
        target.children = files.map(function(file) {
            var subPath = Path.resolve(target.path, file);
            var stats = fs.statSync(subPath);
            var model = {
                path: subPath,
                name: file,
                type: stats.isDirectory() ? 'directory' : 'file'
            }

            if(model.type === 'directory') {
                stack.push(model)
            }

            return model;
        });
    }

    return result;
}

var cwd = process.cwd();
var tree = readDirs(cwd);
fs.writeFileSync(Path.join(cwd, 'tree.json'), JSON.stringify(tree));*/



// 异步模式
// 方案1：过程式 Promise

/*var fs = require('fs')
var Path = require('path')
//promise包装的fs.stat方法
var stat = function(path) {
    return new Promise(function(resolve, reject) {
        fs.stat(path, function(err, stats) {
            err ? reject(err) : resolve(stats)
        })
    })
}
//promise包装的fs.readdir方法
var readdir = function(path) {
    return new Promise(function(resolve, reject) {
        fs.readdir(path, function(err, files) {
            err ? reject(err) : resolve(files)
        })
    })
}
//promise包装的fs.writeFile
var writeFile = function(path, data) {
    return new Promise(function(resolve, reject) {
        fs.writeFile(path, JSON.stringify(data || ''), function(err) {
            err ? reject(err) : resolve
        })
    })
}

function readdirs(path) {
    return readdir(path) //异步读取文件夹
    .then(function(files) { //拿到文件名列表
        var promiseList = files.map(function(file) { //遍历列表
            var subPath = Path.resolve(path, file) //拼接为绝对路径
            return stat(subPath) //异步读取文件信息
            .then(function(stats) { //拿到文件信息
                //是文件夹类型的，继续读取目录，否则返回数据
                return stats.isDirectory() ?
                readdirs(subPath) : {
                    path: subPath,
                    name: file,
                    type: 'file'
                }
            })
        })
        return Promise.all(promiseList) //等待所有promise完成
    })
    .then(function(children) { //拿到包含所有数据的children数组
        return { //返回结果
            path: path,
            name: Path.basename(path),
            type: 'directory',
            children: children
        }
    })
}

var cwd = process.cwd()

readdirs(cwd)
.then(writeFile.bind(null, Path.join(cwd, 'tree.json'))) //保存在tree.json中，去查看吧
.catch(console.error.bind(console)) //出错了就输出错误日志查看原因*/



// ES6-class + ES6-Promise

import fs from 'fs'
import {join, resolve, isAbsolute, basename, extname, dirname, sep} from 'path'

/**
 * 获取目录下的所有文件
 * @param {string} path
 * @return {promise} resolve files || reject error
 */
let readdir = (path) => {
    return new Promise((resolve, reject) => {
        fs.readdir(path, (err, files) => {
            err ? reject(err) : resolve(files)
        })
    })
}

/**
* 将data写入文件
* @param {string} path 路径
* @param {data} data
* @return {promise} resolve path || reject error
*/
let writeFile = (path, data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, data, (err) => {
            err ? reject(err) : resolve(path)
        })
    })
}

/**
* 获取文件属性
* @param {string} path
* @return {promise} resolve stats || reject error
*/
let stat = (path) => {
    return new Promise((resolve, reject) => {
        fs.stat(path, (err, stats) => {
            err ? reject(err) : resolve(stats)
        })
    })
}

/**
* 判断path是否存在
* @param {string} path 路径
* @return {promise} resolve exists
*/
let exists = (path) => {
    return new Promise((resolve) => fs.exists(path, resolve))
}


//文档类
class Document {
    constructor(path) {
        this.path = path
        this.name = basename(path)
    }
    //存在性判断
    exists() {
        return exists(this.path)
    }
    //异步获取文件信息
    stat() {
        return stat(this.path)
    }
    //输出基本数据
    json() {
        return JSON.stringify(this)
    }
    //将基本数据保存在path路径的文件中
    saveTo(path) {
        if (isAbsolute(path)) {
            return writeFile(path, this.json())
        }
        return writeFile(resolve(this.path, path), this.json())
    }
}

//文件类，继承自文档类
class File extends Document {
    constructor(path) {
        super(path) //必须先调用超类构造方法
        this.type = 'file' //type 为 file
        this.extname = extname(path) //新增扩展名
    }
    //写入数据
    write(data = '') {
        return writeFile(this.path, data)
    }
    //其他文件特有方法如 read unlink 等
}


//文件夹类，继承自文档类
class Directory extends Document {
    constructor(path) {
        super(path) //必须先调用超类构造方法
        this.type = 'directory'
    }
    //读取当前文件夹
    readdir() {
        return readdir(this.path) //读取目录
        .then((files) => { //拿到文件名列表
            let promiseList = files.map((file) => {
                let subPath = resolve(this.path, file) //拼接为绝对路径
                return stat(subPath) //获取文件信息
                .then((stats) => {
                    //根据文件信息，归类为Directory或File类型
                    return stats.isDirectory() ?
                    new Directory(subPath) :
                    new File(subPath)
                })
            })
            return Promise.all(promiseList)
        })
        .then((children) => { //拿到children数组
            this.children = children //保存children属性
            return children //返回children
        })
    }
    //深度读取文件目录
    readdirs() {
        return this.readdir() //读取当前文件夹
        .then((children) => { //拿到children
            let promiseList = []
            children.map((child) => {
                if (child instanceof Directory) { //是文件夹实例，继续深度读取文件目录
                    promiseList.push(child.readdirs())
                }
            })
            return Promise.all(promiseList) //等待所有子元素深度读取目录完毕
        })
        .then(() => this) //返回this
    }
    //其他文件夹特有方法如 addFile removeFile addDir remveDir 等
}

let cwd = process.cwd()

new Directory(cwd)
.readdirs()
.then((tree) => {
    tree.saveTo('tree.json') //让它自己保存在tree.json里
})
.catch(console.error.bind(console)) //输出错误日志