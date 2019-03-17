# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2019-3-17
### Changed
- 更改了add snippet接口
- 增加了update snippet接口

## [1.16.1] - 2019-3-3
### Fixed
- 改变Dockerfile中依赖的es-ik插件版本

## [1.16.0] - 2019-1-19
### Added
- 增加了snippet相关接口

## [1.15.2] - 2018-11-7
### Fixed
- 修复了一些package-lock里的不安全依赖

## [1.15.1] - 2018-10-27
### Fixed
- 修复了增加article没有返回的问题

## [1.15.0] - 2018-10-26
### Added
- 在store和esclient之间增加client中间层, 处理启动时es初始化一段时间无法访问的问题
- 新安装的实例自动初始化es数据结构
- 增加了备份和恢复接口
- 将打包到docker的配置文件一并加入版本管理

## [1.14.0] - 2018-10-23
### Added
- 增加了docker支持
### Changed
- 更改了项目名称

## [1.13.0] - 2018-10-21
### Added
- 增加了剪裁接口

## [1.12.0] - 2018-10-18
### Added
- 删除接口
- 增加了隐藏功能
- 所有接口对deleted敏感
### Changed
- 重构search部分代码

## [1.11.0] - 2018-10-17
### Added
- 允许增加链接的时候传入标签

## [1.10.0] - 2018-10-17
### Added
- 增加了随机搜索的api

## [1.9.2] - 2018-10-17
### Fixed
- 修复了因为错误使用`_.trimStart`导致的tag缺失头部的问题

## [1.9.1] - 2018-10-17
### Fixed
- 处理搜索请求传入字符串'undefined'的情况

## [1.9.0] - 2018-10-12
### Added
- 搜索请求里不包含任何fulltext字段, 那么结果按事件倒序

## [1.8.0] - 2018-10-10
### Added
- 增加了修改文章的接口
- 增加了type的shortcut
### Fixed
- 添加comment等没有时间的问题

## [1.7.0] - 2018-10-06
###  Added
- 增加了comment和article类型以及对应的接口
- 同意了打印日志的方式

## [1.6.0] - 2018-10-05
### Added
- 增加了搜索分页的功能

## [1.5.1] - 2018-10-05
### Fixed
- 修复了exist接口存在缓存返回304的情况

## [1.5.0] - 2018-10-04
### Added
- 增加了tag编辑api

## [1.4.0] - 2018-10-03
### Added
- 增加了链接是否存在查询
- 能够按tag查找
- 能够按facet查找

## [1.3.0] - 2018-10-02
### Added
- 增加了链接添加接口

## [1.2.0] - 2018-10-01
### Added
- 添加了LICENSE
- 添加了测试机制
- 添加了model层和store层
- 添加了对书签的支持
- 添加了书签导入脚本

## [1.1.0] - 2018-09-25
### Added
- 增加了通用blog添加接口
### Changed
- 将zhihu接口和通用blog接口公用的逻辑抽出来

## [1.0.0] - 2018-09-23
### Added
- 添加了版本管理和changelog
- 添加了基本的业务逻辑