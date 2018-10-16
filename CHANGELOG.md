# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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