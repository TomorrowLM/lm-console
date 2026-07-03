# an-ui-mobile - 移动端组件库

**Pages:** 10

---

## 高级表单 | FormPro

**Path:** `src/components/FormPro/`

**Contents:**
- 高级表单
- 代码演示
  - 基础用法
  - 表单分组
  - 动态表单
  - 表单联动
  - 远程加载选项
  - 自定义表单项
  - 所有表单项类型
- API
  - FormProProps
  - FormFieldConfig

基于 antd-mobile Form 组件封装，通过配置项快速生成表单，减少重复代码。核心在于表单项的配置 `FormFieldConfig[]`。

### 支持的表单项类型

input、textarea、date、switch、radio、checkbox、select、remoltSelect、cascader、upload、file、selector、time、custom、header、signature、repeat

### API

**FormProProps：**

| 属性 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| className | string | 自定义类名 | - |
| style | CSSProperties | 自定义样式 | - |
| fieldsConfig | FormFieldConfig[] | 表单配置项 | 必填 |
| fieldComponents | Record<string, React.FC> | 自定义表单项组件 | - |
| pickFields | string[] | 解决 field 生成问题 | [] |
| formExtra | any | 额外传给表单项的参数 | - |
| readOnly | boolean | 全局只读，Item 中的 readOnly 优先级更高 | false |
| form | FormInstance | 表单实例 | 必传 |

**FormFieldConfig：**

完全继承 antd-mobile Form.Item 的 props，并扩展了以下属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| type | string | 表单项类型 |
| name | string | 表单项名称 |
| label | string | 标签文本 |
| hide | boolean \| ((values, formExtra, index) => boolean) | 是否隐藏（不渲染） |
| readOnly | boolean \| ((values, formExtra, index) => boolean) | 是否只读 |
| disabled | boolean \| ((values, formExtra, index) => boolean) | 是否禁用 |
| required | boolean \| ((values, formExtra, index) => boolean) | 是否必填 |
| dependencies | string[] | 依赖字段列表，值变化时触发本字段重新渲染（用于表单联动） |
| templateOptions | object \| ((values, formExtra, index) => object) | 表单项组件的 props，扩展了 request 属性支持接口获取 options |

**Examples：**

**基础用法：**

```tsx
import { Form } from 'antd-mobile';
import FormPro from '@/components/FormPro';

const form = Form.useForm();

const fieldsConfig = [
  {
    type: 'input',
    name: 'name',
    label: '姓名',
    required: true,
    templateOptions: {
      placeholder: '请输入姓名',
    },
  },
  {
    type: 'select',
    name: 'gender',
    label: '性别',
    templateOptions: {
      options: [
        { label: '男', value: 'male' },
        { label: '女', value: 'female' },
      ],
    },
  },
];

export default function MyForm() {
  return (
    <FormPro form={form} fieldsConfig={fieldsConfig} />
  );
}
```

**表单联动（hide + required + dependencies）：**

```tsx
const fieldsConfig = [
  {
    type: 'switch',
    name: 'enableOther',
    label: '是否启用其他字段',
  },
  {
    type: 'input',
    name: 'otherField',
    label: '其他字段',
    dependencies: ['enableOther'], // 监听 enableOther 变化
    hide: (values) => !values.enableOther,
    required: (values) => values.enableOther,
  },
];
```

**三路径条件表单：**

```tsx
const fieldsConfig = [
  {
    type: 'radio',
    name: 'checkResult',
    label: '执行结果',
    templateOptions: {
      options: [
        { label: '合格', value: 10 },
        { label: '不合格', value: 20 },
      ],
    },
  },
  // 路径A：依赖 checkResult = 10
  {
    type: 'textarea',
    name: 'checkDescription',
    label: '执行描述',
    dependencies: ['checkResult'],
    hide: (values) => values.checkResult !== 10,
    required: (values) => values.checkResult === 10,
  },
  // 路径B/C：依赖 checkResult = 20
  {
    type: 'upload',
    name: 'eventPictureUrlList',
    label: '事件照片',
    dependencies: ['checkResult'],
    hide: (values) => values.checkResult !== 20,
    required: (values) => values.checkResult === 20,
  },
  {
    type: 'select',
    name: 'level',
    label: '事件等级',
    dependencies: ['checkResult'],
    hide: (values) => values.checkResult !== 20,
    required: (values) => values.checkResult === 20,
  },
  // 子路径：依赖 checkResult + rectifyMode
  {
    type: 'input',
    name: 'rectifyDays',
    label: '整改时限',
    dependencies: ['checkResult', 'rectifyMode'],
    hide: (values) => values.checkResult !== 20 || values.rectifyMode !== 20,
    required: (values) => values.checkResult === 20 && values.rectifyMode === 20,
  },
];
```

**远程加载选项：**

```tsx
const fieldsConfig = [
  {
    type: 'select',
    name: 'department',
    label: '部门',
    templateOptions: {
      request: async () => {
        const res = await fetch('/api/departments');
        return res.data;
      },
    },
  },
];
```

**重复表单项（Form.Array）：**

```tsx
const fieldsConfig = [
  {
    type: 'repeat',
    name: 'items',
    title: '项目',
    addText: '添加项目',
    children: [
      {
        type: 'input',
        name: 'name',
        label: '项目名称',
        required: true,
      },
      {
        type: 'input',
        name: 'value',
        label: '项目值',
      },
    ],
  },
];
```

**自定义表单项：**

```tsx
// 方式一：直接传入 children
{
  type: 'custom',
  name: 'customField',
  label: '自定义字段',
  templateOptions: {
    children: <CustomInput />,
  },
}

// 方式二：注册自定义组件类型
const fieldComponents = {
  customInput: CustomInput,
};

{
  type: 'customInput',
  name: 'customField',
  label: '自定义字段',
}
```

---

## 无限滚动列表 | InfiniteScrollPro

**Path:** `src/components/InfiniteScrollPro/`

**Contents:**
- 无限滚动列表
- API
  - InfiniteScrollProProps

基于 antd-mobile InfiniteScroll 封装，内置分页逻辑、加载状态、空状态和失败重试。

**ListProProps：**

| 属性 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| className | string | 自定义类名 | - |
| style | CSSProperties | 自定义样式 | - |
| height | CSSProperties['height'] | 容器高度 | - |
| pageSize | number | 每页条数 | 20 |
| rowKey | string | 行唯一标识 | 'id' |
| emptyDescription | string | 空数据描述 | - |
| renderRow | (record, index) => ReactNode | 渲染行 | 必填 |
| request | (page) => Promise<{data, total}> | 请求方法 | 必填 |
| isNoMore | (res, data) => boolean | 自定义无更多判断 | 内置逻辑 |

**Examples：**

```tsx
<InfiniteScrollPro
  pageSize={20}
  request={async ({ current, pageSize }) => {
    const res = await fetchList({ pageNo: current, pageSize });
    return res;
  }}
  renderRow={(item) => <div key={item.id}>{item.name}</div>}
/>
```

---

## 下拉搜索 | PulldownSearch

**Path:** `src/components/PulldownSearch/`

**Contents:**
- 下拉搜索
- 代码演示
  - 基础用法
- API
  - PulldownSearchProps

适用于需要搜索和筛选的列表场景，整合 SearchBar + Dropdown + Form，支持筛选条件展示和快速删除。

**PulldownSearchProps：**

| 属性 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| placeholder | string | 搜索占位文本 | '请输入搜索内容' |
| searchKey | string | 搜索字段名 | 'searchKey' |
| fieldsConfig | FilterFormFieldConfig[] | 筛选字段配置 | [] |
| total | number | 总记录数 | 0 |
| onConfirm | (params) => void | 筛选确认回调 | - |
| onSearch | (params) => void | 搜索回调 | - |
| onReset | (params) => void | 重置回调 | - |
| form | FormInstance | 表单实例 | 必传 |
| filterInitialValues | object | 筛选初始值 | - |
| showSearchBtn | boolean | 是否显示搜索按钮 | true |

**Examples：**

```tsx
<PulldownSearch
  form={form}
  total={total}
  fieldsConfig={[
    { type: 'selectBtn', name: 'status', label: '状态', templateOptions: { options: [...] } },
    { type: 'date', name: 'date', label: '日期' },
  ]}
  onSearch={(params) => fetchList(params)}
  onConfirm={(params) => fetchList(params)}
/>
```

---

## 弹窗 | PopupPro

**Path:** `src/components/PopupPro/`

**Contents:**
- 弹窗
- API
  - PopupProProps

基于 antd-mobile Popup 封装，增加了标题栏和关闭按钮，默认高度 70vh。

完全继承 antd-mobile PopupProps，在此基础上扩展了 `title` 属性。

**Examples：**

```tsx
<PopupPro
  title="选择人员"
  visible={visible}
  onClose={() => setVisible(false)}
>
  <div>弹窗内容</div>
</PopupPro>
```

---

## 空状态 | EmptyPro

**Path:** `src/components/EmptyPro/`

**Contents:**
- 空状态
- API
  - EmptyProProps

基于 antd-mobile Empty 封装，使用统一的空状态图片，默认描述为「暂无数据」。

完全继承 antd-mobile EmptyProps。

**Examples：**

```tsx
<EmptyPro description="暂无记录" />
```

---

## 文件预览 | FileView

**Path:** `src/components/FileView/`

**Contents:**
- 文件预览
- API
  - FileViewProps

统一的文件预览组件，自动识别文件类型（image / video / word / pdf / ppt / excel），支持 OSS 签名 URL 转换、弹窗预览和下载。

**FileViewProps：**

| 属性 | 类型 | 说明 |
|------|------|------|
| src | string | 文件地址 |
| showDownload | boolean | 是否显示下载 |
| triggerText | string | 触发文本按钮 |
| trigger | ReactNode | 自定义触发器 |
| disabled | boolean | 禁用预览 |

**Examples：**

```tsx
// 图片预览
<FileView src="path/to/image.png" />

// 文档预览（弹窗）
<FileView src="path/to/doc.pdf" triggerText="查看文件" showDownload />
```

---

## 图标 | Icon

**Path:** `src/components/Icon/`

**Contents:**
- 图标
- API
  - IconProps

通用 Icon 组件，配合 vite-plugin-svgr 使用，将 SVG 文件作为 React 组件渲染，支持 size 和 color 控制。

**IconProps：**

| 属性 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| component | React.FC | SVG 组件 | 必填 |
| size | number | 图标尺寸 | 24 |
| color | string | 图标颜色 | - |
| className | string | 自定义类名 | - |
| onClick | () => void | 点击回调 | - |

**Examples：**

```tsx
import { ReactComponent as HomeIcon } from '@/assets/icons/home.svg';

<Icon component={HomeIcon} size={20} color="#1989fa" />
```

---

## 人员选择 | RyChoose

**Path:** `src/components/RyChoose/`

**Contents:**
- 人员选择
- 代码演示
  - 单选模式
  - 多选模式
- API
  - RyChooseProps
  - RyChooseRef

人员选择组件，支持单选/多选模式，内置部门树浏览和关键词搜索双模式，支持企业组织模式下的本单位/入驻单位切换。

**RyChooseProps：**

| 属性 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| type | 'single' \| 'multiple' | 选择模式 | 'multiple' |
| choice | (string \| object)[] | 已选人员 | [] |
| rylxDms | number[] | 人员类型代码 | [1,3,4,5,6,7,9,10,11,12,13] |
| showSearch | boolean | 是否显示搜索 | true |
| title | string | 标题 | - |
| placeholder | string | 搜索占位文本 | '请输入手机号或者姓名' |
| show | boolean | 是否显示部门树 | false |
| isQyzz | boolean | 是否企业组织模式 | false |
| nsrmc | string | 纳税人名称 | '' |

**RyChooseRef：**

| 方法 | 说明 |
|------|------|
| getData() | 获取已选人员列表（自动去重） |
| reset() | 清空已选人员 |

**Examples：**

```tsx
const ryRef = useRef<RyChooseRef>(null);

<RyChoose
  ref={ryRef}
  type="multiple"
  choice={selectedUsers}
  show={visible}
/>

// 获取已选
const users = ryRef.current?.getData();
```

---

## 搜索框 | Search

**Path:** `src/components/Search/`

**Contents:**
- 搜索框
- API
  - SearchProps

基于 antd-mobile SearchBar 封装，内置 300ms 防抖，支持显示取消按钮。

完全继承 antd-mobile SearchBarProps。

**Examples：**

```tsx
<Search
  placeholder="请输入姓名"
  onChange={(val) => console.log(val)}
/>
```

---

## 签名 | Signature

**Path:** `src/components/Signature/`

**Contents:**
- 签名
- API
  - SignatureProps

手写签名组件，基于 canvas 实现，支持清空、保存等操作。

**Examples：**

```tsx
<Signature
  onChange={(base64) => console.log(base64)}
/>
```
