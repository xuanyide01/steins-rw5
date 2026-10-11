from pathlib import Path
import json,hashlib,shutil,zipfile
root=Path(__file__).resolve().parents[1];out=root.parents[1]/'outputs';out.mkdir(exist_ok=True)
audit=json.loads((root/'reports/package-audit.json').read_text('utf8'))
package=root/'dist'/audit['file'];assert package.stat().st_size<=25000000
assert hashlib.sha256(package.read_bytes()).hexdigest()==audit['sha256']
version=json.loads((root/'src/manifest.json').read_text('utf8'))['versionName']
native=json.loads((root/'native-test-results/report.json').read_text('utf8')) if (root/'native-test-results/report.json').exists() else {'result':'pending'}
assert native['result']=='passed' and native['sha256']==audit['sha256'],'native report must match this exact package'
assert native['version']==version,'native report version must match this release'
start=json.loads((root/'native-test-results/start-check.json').read_text('utf8'))
assert start['result']=='passed' and start['sha256']==audit['sha256']
optimization=json.loads((root/'reports/story-optimization.json').read_text('utf8'))
assert optimization['result']=='passed'
name='命运石之门-REDMIWatch5-'+version
for suffix in ['bin','rpk']:shutil.copyfile(package,out/(name+'.'+suffix))
tools=['mpk.py','sc3_text.py','prepare-source.py','build-original-font.py','font-ascii-prefix.json','convert-assets.py','compile-story.py','legacy-cursor-baseline.json','finish-assets.py','regroup-gallery.py','generate-maps.py','repair-graphics-assets.py','build-background-variants.py','build-gallery-scenes.py','build-visual-recovery.py','alias-default-faces.py','archive-obsolete-images.py','build.cjs','repack-rpk.cjs','rpk_signature.py','audit-package.py','load-data.cjs','verify-routes.cjs','audit-phone.cjs','trace-story.cjs','source-provenance.json','setup-emulator.cjs','emulator-server.cjs','emulator-view.html','native-check.cjs','native-text-check.cjs','package-delivery.py']
tools+=['native-start-check.cjs','prepare-runtime.cjs','optimize-story.cjs','verify-optimization.cjs','story-reference.json','verify-delivery.py','record-performance.cjs']
reports=['original-font.json','assets.json','graphics-assets.json','gallery-composition.json','visual-recovery.json','story-compile.json','route-validation.json','package-audit.json','phone-audit.json','delivery-verification.json','skip-performance.json']+[f'{kind}-{n}.json' for n in ['suzuha','faris','luka','mayuri','kurisu','true'] for kind in ['route','visual','recovery']]
reports+=['memory-optimization.json','story-optimization.json','lazy-route-validation.json']
files=[root/n for n in ['README.md','THIRD_PARTY_NOTICES.md','LICENSE','package.json','quickapp.config.js','.gitignore']]
for directory in ['src','tests','tools/sc-spec-bank','tools/licenses']:
 files.extend(p for p in (root/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name!='saved-last.png')
files.extend(p for p in (root/'native-test-results').iterdir() if p.is_file() and p.suffix in ['.png','.json'] and p.name not in ['skip-before-fix.png','upgrade-current.png','saved-last.png'])
files.extend(root/'tools'/n for n in tools);files.extend(root/'reports'/n for n in reports)
with zipfile.ZipFile(out/(name+'-源码.zip'),'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files:z.write(p,'steins-rw5/'+p.relative_to(root).as_posix())
with zipfile.ZipFile(out/(name+'-源码.zip'),'r') as z:
 assert z.testzip() is None
text=f'''# 《命运石之门》红米手表 5 测试版 {version}

作者：xuanyide。工程实现由 Codex 完成。

- 安装包：{name}.bin；{audit['bytes']:,} 字节，约 {audit['bytes']/1000000:.2f} MB。
- SHA-256：`{audit['sha256']}`。
- .bin 与 .rpk 内容完全相同；优先用“表盘自定义工具”安装 .bin。
- 六条结局主流程、35 项回归、30 栏位独立状态、章节快进停止和字形覆盖检查已通过。
- 原生模拟器最终检查：{native['result']}；安装、旧档迁移、完整冷启动存档恢复、长台词和长邮件滚动均通过；实机尚未测试。

本次针对实机“开始游戏返回桌面”削减运行时负担：原作字库由 2.20 MB 减至 0.87 MB；邮件和论坛正文按需读取，相关预载资源 455401→132150 字节；首句状态离线生成并核对全部 2048 种通关标志组合。剧情缓存最多 3 块／40000 源字符，回看历史最多 8 句／48000 字符，存档列表只保留预览，选中再读取完整状态。英文恢复正常字符与词间空格，El Psy Kongroo／Lab 不再逐字隔开；通讯录随原作指令增加、移除和重置，借用手机保留独立状态。

转换阶段折叠 639 个常量表达式，将 23770 条相邻赋值合并为 7125 组，省去 449 个覆盖前不读取的常量写入；原逻辑位置、选项和手机等待边界保留。六结局逐帧比较 137550 个可见帧及全部 VM 状态，一致；解释器分发减少 35.45%–35.68%，不代表同等耗时降幅。0.1.3 与更旧版本的存档键及 runtime3 位置保持兼容。

此前修复：清理台词异常空格，台词与邮件按字形宽度换行并提供纵向滚动；显示原作故事日期；手机增加短信／邮件、已发送记录和联系人，借用绯莉丝、萌郁与 FB 手机时切换机主并隔离记录。按原作宏执行背景／立绘的预加载、交换、显示与释放，保留透明图层、表情及原作坐标，修复无脸人物和错误叠图。章节名称对齐原作，第十章名称按剧情状态显示。章节入口保留原作主流程，避免只读到开头剧情段就结束。剧情计算时阻止重复翻页，并支持前后台恢复。优化剧情分块缓存，修复快进误报和等待循环；邮件阅读的关闭按钮明确返回剧情。旧档迁移位置并按需恢复显示缓冲，保留栏位、剧情与邮件状态。

按[所给攻略](https://www.bilibili.com/opus/1009312096192561201)核对关键邮件，将关键选项与一般选项区分。检查覆盖 28 个手机开放点、38 种电话／发送动作、4 个 D-Mail 开放点、176 封来信、163 个回复转换和六条结局路径中的 829 次交互；并非全部选项组合的穷举。

保留角色立绘、77 组 / 133 张事件 CG、30 存档栏位、章节选择、菜单内的安全快进、电话 / 邮件选择、圆形图标。原作语音、音乐、影片和部分特效未包含。

官方模拟器中重复开始游戏 8 次、真实英文场景、序章与第四章通讯录差异，以及旧档和长文本检查通过。章节跳跃仍会执行必要状态与选项判断，等待时间受资源读取与缓存影响，期间请等待加载结束；实机耗时尚未测量。0.1.3 实机崩溃没有固件日志，无法确认唯一原因，新版仍需实机复测。标题暂保留静态原图，未增加旋转动画以优先降低启动负担。

按攻略通关请从“开始游戏”进入或读取完整流程的存档；“选择章节”是使用独立初始状态的阅读入口，不会补齐前章标志。

传输结束后需继续等待手表解包安装。解包文件约 {audit['expandedBytes']/1000000:.2f} MB，文件系统分配、上传暂存和覆盖安装目录会增加空间需求。若无响应，先退出或重启手表；重装会有丢失本应用存档的可能。不要把恢复出厂设置作为第一步处理。包内没有刷写固件代码，但不能保证所有实机固件都不会崩溃。

官方模拟器在开发检查中出现过快速 ADB 停止后立即启动的调试服务异常；最终恢复验证采用完整冷启动。详见源码包的原生检查报告与 README。

源码包提供转换脚本、Vela 代码、图文资源、路线和签名报告。自编代码为 MIT，原作素材及衍生字库仍受原权利人授权约束。本次仅生成本地文件，尚未公开上传 GitHub。

源码包已与独立目录中的源文件核对，35 项回归与独立构建、包签名和资源检查通过；交付仍采用实际通过原生检查的准确安装包。25 MB 的大小限制针对手表安装包。
'''
(out/(name+'-测试说明.md')).write_text(text,'utf8')
print(json.dumps({'bin':str(out/(name+'.bin')),'source':str(out/(name+'-源码.zip')),'packageBytes':audit['bytes'],'native':native['result']},ensure_ascii=False))
