# 第三方与原作权利

自编应用代码、场景转换和检查脚本采用MIT，作者xuanyide。Codex完成工程实现，人类维护者提供需求、资源与实机验收。

离线参考工程使用Committee of Zero的MgsScriptTools、sc3tools、impacto，以及AbsurdlySuspicious的sg-sprite文档；对应MIT、ISC与Apache2.0许可副本保留在tools/licenses。新版本不在手表上运行这些工具或原SC3解释器。

原作《命运石之门》的剧情、图片、字体及转换结果归MAGES./5pb./Nitroplus与相关权利人，不因代码采用MIT而重新授权。外部aiot-toolkit和官方Vela模拟器按其各自许可使用，不随源码包附带。


## 0.2.6 原作标题音乐与核对工具

`src/common/title-piano.mp3`来自维护者提供的Steam原版`USRDIR/bgm.mpk`第0项`BGM03.ogg`，对应`_STARTUP_WIN`的`BGMplay 0`。音乐仍归原权利人，不适用自编代码MIT许可证。电脑端使用FFmpeg 7.1/libmp3lame转码，手表包不附带转码器。原片核对使用[官方RAD Video Tools](https://www.radgametools.com/bnkdown.htm)只读导出少量核对帧，不将其程序加入源码或安装包。音频API依照[小米Vela官方音频文档](https://iot.mi.com/vela/quickapp/zh/features/other/audio.html)。

## 0.2.7 原作标题动画

`src/common/title-machine/atlas*.png`由维护者提供的Steam原版`USRDIR/movie/1280x720/title.bk2`299帧透明动画裁剪、缩放和合并，不含新绘制或补帧。素材仍归原权利人。只读解码使用官方RAD Video Tools，图集制作使用Pillow；对应外部程序和原片不随安装包或源码归档。正常构建直接使用已转换图集。

## 0.2.8 原作OP

`common/opening`源于Steam原版`USRDIR/movie/1280x720/OP.bk2`，对应原`MAIN00`的`PlayMovie 32`。画面通过官方RAD工具只读导出，使用Pillow等比缩小、JPEG编码和图集合并；音轨使用FFmpeg/libmp3lame转换。原画面和音乐仍归原权利人，不适用自编代码MIT授权。原片、WAV、临时PNG及外部工具不放入安装包和源码归档。实现使用公开的[image组件](https://iot.mi.com/vela/quickapp/zh/components/basic/image.html)及[原生audio接口](https://iot.mi.com/vela/quickapp/zh/features/other/audio.html)，没有新增原生插件或修改手表固件。

0.2.9改为保留原片2,750帧、约24帧/秒，176×99压缩画面以352×198居中显示，十帧一条图集、双缓冲预载；没有生成或插值新画面。标题音乐仍为同一音轨，循环改用公开的ended事件及stop/play方法，取消原生loop回绕。

## 0.3.0 媒体转换

标题音乐由同一BGM03.ogg只读转为8kHz、16位单声道PCM WAV，添加尾部静音缓冲和短淡出；OP恢复原片每两帧取一帧的12fps，用Pillow生成小图集。未重新生成原作图像或插帧。原作媒体仍归原权利人，外部解码器不随包附带。本版不再新导出独立OP视频。
