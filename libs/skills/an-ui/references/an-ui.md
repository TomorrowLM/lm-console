# an-ui - An-Ui

**Pages:** 10

---

## 可编辑表格 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/EditableTable/_demo/

**Contents:**
- 可编辑表格
- 代码演示：基础用法、单行编辑
- API：EditableTableProps、EditableTableColumnType、EditableTableRef

可编辑的表格，用于在表格中直接进行数据编辑。在 AntdTable 和 FormPro 的基础上进行封装。columns 属性可同时配置 FormItem 和 AntdTable 的属性，dataIndex 作为表单项的 name 使用且必须唯一；若不传 type 则渲染为普通表格列。

### Props — EditableTableProps

| 属性 | 类型 | 说明 |
|------|------|------|
| value | `any[]` | 当前数据 |
| onChange | `(value: any[]) => void` | 数据变化回调 |
| columns | `EditableTableColumnType[]` | 列配置（同时支持 FormFieldConfig 和 AntdTable column） |
| tableProps | `TableProps<any>` | 透传给 Antd Table 的属性 |
| formProps | `Omit<FormProProps, "fieldsConfig">` | 透传给 FormPro 的属性 |
| addText | `React.ReactNode` | 新增按钮文本 |
| maxLength | `number` | 最大行数限制 |
| fieldComponents | `FormProProps["fieldComponents"]` | 自定义表单项组件 |
| formExtra | `FormProProps["formExtra"]` | 额外传给表单项组件的参数 |
| editableKeys | `string[]` | 可编辑的行 key 数组 |

### Ref — EditableTableRef

| 方法 | 类型 | 说明 |
|------|------|------|
| form | `FormInstance` | 表单实例 |
| onAdd | `(position?: AddPosition, row?: any) => void` | 新增一行（默认底部） |
| onDelete | `(key: string) => void` | 删除指定行 |
| onCopy | `(key: string, position?: AddPosition, row?: any) => void` | 复制行 |

AddPosition: `"top" | "bottom"`

### Types — EditableTableColumnType

```typescript
type EditableTableColumnType = Omit<TableColumnType<any>, "render"> & FormFieldConfig & {
  render?: (value: any, record: any, index: number, action: EditableTableRef) => React.ReactNode;
};
```

---

## 弹窗表单 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/ModalForm/_demo/

**Contents:**
- 弹窗表单
- 代码演示：基础用法、新增编辑、自定义底部按钮
- API：ModalFormProps、ModalFormRef

适用于需要在弹窗中进行表单录入的场景。提供了 trigger 来减少 state 的使用。完全继承 FormPro 和 antd Modal 的 api。

### Props — ModalFormProps

| 属性 | 类型 | 说明 |
|------|------|------|
| trigger | `React.ReactElement` | 触发打开弹窗的元素，传入后可省略 open 状态管理 |
| modalProps | `ModalProps` | 透传给 antd Modal 的属性 |
| formProps | `Omit<FormProProps, "fieldsConfig">` | 透传给 FormPro 的属性 |
| title | `ModalProps["title"] \| ((values: any) => React.ReactNode)` | 标题，支持函数式渲染（新增/编辑共用） |
| width | `ModalProps["width"]` | 弹窗宽度 |
| fieldsConfig | `FormProProps["fieldsConfig"]` | **必填** 表单项配置 |
| fieldComponents | `FormProProps["fieldComponents"]` | 自定义表单项组件 |
| open | `ModalProps["open"]` | 控制弹窗打开/关闭 |
| footer | `ModalProps["footer"]` | 底部按钮 |
| layout | `FormProProps["layout"]` | 表单布局 |
| labelCol | `FormProProps["labelCol"]` | 标签列布局 |
| wrapperCol | `FormProProps["wrapperCol"]` | 内容列布局 |
| cols | `FormProProps["cols"]` | 表单项列数 |
| initialValues | `FormProProps["initialValues"]` | 表单初始值 |
| onOk | `(values: any, editValues?: any) => Promise<any> \| unknown` | 确定回调，返回 Promise 可控制按钮 loading |
| onOpenChange | `(open: boolean) => void` | 打开/关闭状态变化回调 |
| onCancel | `() => void` | 取消回调 |

### Ref — ModalFormRef

| 方法 | 类型 | 说明 |
|------|------|------|
| open | `(values?: any \| (() => Promise<any>)) => void` | 打开弹窗并填充值 |
| close | `() => void` | 关闭弹窗 |
| setOpen | `(open: boolean) => void` | 设置打开状态 |
| form | `FormProProps["form"]` | 表单实例 |

---

## 抽屉 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/DrawerPro/_demo/

**Contents:**
- 抽屉
- 代码演示：基础用法、自定义底部按钮
- API：DrawerProProps

antd 的抽屉不提供底部按钮功能，DrawerPro 在此基础上增加了底部按钮，用法和 antd Modal 底部按钮一致。提供了 trigger 减少 state 使用。

### Props — DrawerProProps

继承 `Omit<DrawerProps, "footer">`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| cancelText | `string` | 取消按钮文本，默认"取消" |
| okText | `string` | 确定按钮文本，默认"确定" |
| footer | `((originNode: React.ReactNode) => React.ReactNode) \| React.ReactNode \| null` | 底部，函数式可包装默认按钮、传 null 隐藏底部 |
| trigger | `React.ReactElement` | 触发打开的元素 |
| onOk | `() => Promise<boolean> \| unknown` | 确定回调，返回 Promise 可控制按钮 loading |
| onOpenChange | `(open: boolean) => void` | 打开/关闭状态变化回调 |

---

## 抽屉表单 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/DrawerForm/_demo/

**Contents:**
- 抽屉表单
- 代码演示：基础用法、新增编辑
- API：DrawerFormProps、DrawerFormRef

适用于在抽屉中进行表单录入的场景。提供了 trigger 减少 state 使用。完全继承 FormPro 和 DrawerPro 的 api。

### Props — DrawerFormProps

| 属性 | 类型 | 说明 |
|------|------|------|
| trigger | `React.ReactElement` | 触发打开的元素 |
| drawerProps | `DrawerProProps` | 透传给 DrawerPro 的属性 |
| formProps | `Omit<FormProProps, "fieldsConfig">` | 透传给 FormPro 的属性 |
| title | `DrawerProProps["title"] \| ((values: any) => React.ReactNode)` | 标题，支持函数式 |
| width | `DrawerProProps["width"]` | 宽度 |
| fieldsConfig | `FormProProps["fieldsConfig"]` | **必填** 表单项配置 |
| fieldComponents | `FormProProps["fieldComponents"]` | 自定义表单项组件 |
| open | `DrawerProProps["open"]` | 控制打开/关闭 |
| footer | `DrawerProProps["footer"]` | 底部按钮 |
| layout | `FormProProps["layout"]` | 表单布局 |
| labelCol | `FormProProps["labelCol"]` | 标签列布局 |
| wrapperCol | `FormProProps["wrapperCol"]` | 内容列布局 |
| cols | `FormProProps["cols"]` | 表单项列数 |
| initialValues | `FormProProps["initialValues"]` | 表单初始值 |
| onOk | `(values: any, editValues?: any) => Promise<any> \| unknown` | 确定回调 |
| onOpenChange | `(open: boolean) => void` | 打开/关闭状态变化回调 |
| onClose | `() => void` | 关闭回调 |

### Ref — DrawerFormRef

同 ModalFormRef：`open`、`close`、`setOpen`、`form`

---

## 文件列表 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/FileListView/_demo/

**Contents:**
- 文件列表
- 代码演示：基础用法
- API：FileListViewProps

适用于展示文件列表的场景，支持图片风格和文件风格展示。

### Props — FileListViewProps

| 属性 | 类型 | 说明 |
|------|------|------|
| className | `string` | 自定义类名 |
| style | `React.CSSProperties` | 自定义样式 |
| files | `File[]` | 文件列表 |
| type | `"image" \| "file"` | 展示风格：图片风格 or 文件风格 |
| showDownload | `boolean` | 是否显示下载按钮 |
| onDownload | `(file: File) => void` | 下载回调 |

### Types

```typescript
type File = {
  name?: string;
  url: string;    // 文件地址
  size?: number;  // 文件大小(bytes)
  [key: string]: any;
};
```

---

## 搜索列表 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/FilterList/_demo/

**Contents:**
- 搜索列表
- 代码演示：基础用法、批量操作
- API：FilterListProps、BatchButtonProps、FilterListPropsRef

适用于需要搜索和列表展示的场景，将搜索表单和表格进行整合，简化开发流程。

### Props — FilterListProps

| 属性 | 类型 | 说明 |
|------|------|------|
| className | `string` | 自定义类名 |
| style | `React.CSSProperties` | 自定义样式 |
| formProps | `Omit<FilterFormProps, "fieldsConfig">` | 透传给 FilterForm 的属性 |
| tableProps | `TableProProps<RecordType>` | 透传给 TablePro 的属性 |
| fieldsConfig | `FilterFormProps["fieldsConfig"]` | **必填** 搜索表单字段配置 |
| formValues | `Record<string, any>` | 异步初始值 |
| rowKey | `TableProProps["rowKey"]` | 表格行 key |
| columns | `TableProProps["columns"]` | **必填** 表格列配置 |
| frontPagination | `boolean` | 是否前端分页 |
| manual | `boolean` | 是否手动触发请求（不自动请求） |
| batchOperations | `BatchButtonProps[]` | 批量操作按钮配置 |
| toolBarRender | `TableProProps["toolBarRender"]` | 工具栏自定义渲染 |
| request | `(page: any, values: any) => Promise<any>` | **必填** 列表数据请求函数 |
| onClear | `FilterFormProps["onClear"]` | 清空搜索回调 |
| onSearch | `FilterFormProps["onSearch"]` | 搜索回调 |

### BatchButtonProps

继承 `ButtonProps`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| confirm | `ModalFuncProps` | 操作前的确认弹窗配置 |
| completedAction | `"reload" \| "refresh"` | 完成后刷新当前页 / 回到第一页 |
| render | `(keys: React.Key[], item: any) => ReactNode` | 自定义渲染按钮 |
| onSuccess | `(keys: React.Key[], item: any) => void` | 操作成功回调 |
| onOk | `ModalFuncProps["onOk"]` | 确认弹窗确定回调 |

### Ref — FilterListPropsRef

| 属性 | 类型 | 说明 |
|------|------|------|
| values | `any` | 当前表单值 |
| setFormValues | `(values: any) => void` | 设置表单值 |
| form | `any` | antd Form 实例 |
| selectedRowKeys | `React.Key[]` | 当前选中的行 key |
| setSelectedRowKeys | `(keys: React.Key[]) => void` | 设置选中的行 key |
| reload | `() => void` | 刷新表格（保持分页） |
| refresh | `() => void` | 刷新表格（回到第一页） |

---

## 搜索表单 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/FilterForm/_demo/

**Contents:**
- 搜索表单
- 代码演示
- API：FilterFormProps

适用于搜索筛选场景，主要为 FilterList 内部使用。完全继承 FormPro 的 api。

### Props — FilterFormProps

继承 `FormProProps`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| className | `string` | 自定义类名 |
| style | `React.CSSProperties` | 自定义样式 |
| foldRow | `number` | 折叠行数，默认 1，假值=不折叠 |
| searchText | `string` | 搜索按钮文本 |
| clearText | `string` | 重置按钮文本 |
| collapse | `boolean` | 是否折叠 |
| onSearch | `(values: any) => void` | 搜索回调 |
| onClear | `(values: any) => void` | 重置回调 |
| onCollapse | `(collapse: boolean) => void` | 折叠状态变化回调 |

---

## 详情组件 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/DescriptionsPro/_demo/

**Contents:**
- 详情组件
- 代码演示
- API：DescriptionsProProps、DescriptionsProItem

适用于展示只读信息。基于 antd Descriptions 组件二次封装。

### Props — DescriptionsProProps

继承 `DescriptionsProps`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| className | `string` | 自定义类名 |
| style | `React.CSSProperties` | 自定义样式 |
| data | `any` | 数据源 |
| config | `DescriptionsProItem[]` | **必填** 字段配置 |
| emptyColumnValue | `string` | 空值占位符 |
| labelWidth | `React.CSSProperties["width"]` | 标签统一宽度 |

### DescriptionsProItem

继承 `Omit<DescriptionsItemProps, "children">`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| name | `string` | 从 data 中取值的字段名 |
| hide | `boolean \| ((value, data) => boolean)` | 是否隐藏 |
| title | `React.ReactNode \| ((data) => React.ReactNode)` | 标签文本，支持函数式 |
| date | `boolean \| string` | 日期格式化（传 string 时为 format） |
| ellipsis | `ParagraphProps["ellipsis"]` | 文本省略配置 |
| type | `"custom" \| "file"` | 特殊渲染类型 |
| children | `React.ReactNode \| ((value, data) => React.ReactNode)` | 子节点 |
| render | `(value, data) => React.ReactNode` | 自定义渲染 |
| format | `(value, data) => string` | 格式化函数 |

---

## 高级表单 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/FormPro/_demo/

**Contents:**
- 高级表单
- 代码演示：基础用法、oss上传、表单分组、动态表单、表单联动、远程加载选项、自定义表单项、所有表单项类型
- API：FormProProps、FormFieldConfig

基于 Antd Form 封装，通过配置项快速生成表单。核心在于 `FormFieldConfig[]` 配置。

### Props — FormProProps

继承 `FormProps`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| cols | `ColProps` | 表单项默认列数（antd Col span） |
| gutter | `RowProps["gutter"]` | 表单项间距 |
| fieldsConfig | `FormFieldConfig[]` | **必填** 表单项配置数组 |
| fieldComponents | `Record<string, React.FC>` | 自定义表单项组件映射 |
| formExtra | `any` | 额外传给表单项组件的参数 |
| readOnly | `boolean` | 全局只读模式 |

### FormFieldConfig 公共属性

继承 `Omit<FormItemProps, "required" | "children" | "label">`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| type | `string` | 表单项类型，见下方 type 列表 |
| label | `React.ReactNode \| ((values, extra, index) => React.ReactNode)` | 标签 |
| cols | `ColProps` | 当前表单项列数 |
| hide | `boolean \| ((values, extra, index) => boolean)` | 是否隐藏 |
| readOnly | `boolean \| ((values, extra, index) => boolean)` | 是否只读 |
| disabled | `boolean \| ((values, extra, index) => boolean)` | 是否禁用 |
| required | `boolean \| ((values, extra, index) => boolean)` | 是否必填 |
| templateOptions | `object \| ((values, extra, index) => object)` | **关键** 透传给具体表单组件的 props |

### 支持的表单项类型

| type | 对应组件 | templateOptions 类型 |
|------|----------|---------------------|
| `"input"` | Input | `InputProps` |
| `"search"` | Input.Search | `InputProps` |
| `"textarea"` | TextArea | `TextAreaProps` |
| `"select"` | Select | `SelectProps`（扩展了 request） |
| `"cascader"` | Cascader | `CascaderProps`（扩展了 request） |
| `"checkbox"` | Checkbox | `CheckboxProps`（扩展了 request） |
| `"radio"` | Radio | `RadioProps`（扩展了 request） |
| `"switch"` | Switch | `SwitchProps` |
| `"inputNumber"` | InputNumber | `InputNumberProps` |
| `"date"` | DatePicker | `DatePickerProps` |
| `"time"` | TimePicker | `TimePickerProps` |
| `"treeSelect"` | TreeSelect | `TreeSelectProps`（扩展了 request） |
| `"color"` | ColorPicker | `ColorPickerProps` |
| `"upload"` | Upload | `UploadProps` |
| `"autoComplete"` | AutoComplete | `AutoCompleteProps` |
| `"custom"` | 自定义 | `{ children?: React.ReactNode }` |
| `"group"` | 分组容器 | - |
| `"repeat"` | 动态列表 | - |

**说明：** Select、Cascader、TreeSelect、Radio、Checkbox 的 `templateOptions` 支持 `request` 属性用于远程加载选项。

### Group 类型（表单分组）

```typescript
{
  type: "group";
  title?: React.ReactNode;
  children?: FormFieldConfig[];   // 子字段配置
  childrenCols?: ColProps;        // 子字段默认列数
}
```

### Repeat 类型（动态表单）

```typescript
{
  type: "repeat";
  children?: FormFieldConfig[];             // 子字段配置
  childrenCols?: ColProps;                  // 子字段默认列数
  title?: React.ReactNode | ((index: number) => React.ReactNode);
  maxLength?: number;                       // 最大条数
  minLength?: number;                       // 最小条数
  addButtonProps?: ButtonProps;             // 新增按钮配置
}
```

### 表单联动函数签名

`hide`、`readOnly`、`disabled`、`required`、`templateOptions` 等支持函数式：

```typescript
type RelativeParams = [values: any, formExtra: any, index: number];
// values: 当前表单所有值
// formExtra: FormProProps.formExtra 传入的额外参数
// index: repeat 中的索引（非 repeat 时固定）
```

---

## 高级表格 | 公共组件库

**URL:** https://app-test.17an.com/an-ui/TablePro/_demo/

**Contents:**
- 高级表格
- 代码演示
- API：TableProProps、TableColumnProType、TableProRef

基于 Antd Table 封装，提供列设置、排序、扩展操作等功能。

### Props — TableProProps

继承 `Omit<TableProps<RecordType>, "columns" | "title">`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| className | `string` | 自定义类名 |
| style | `React.CSSProperties` | 自定义样式 |
| title | `React.ReactNode` | 表格标题 |
| frontPagination | `boolean` | 是否前端分页 |
| columns | `TableColumnProType<RecordType>[]` | 列配置 |
| showSetting | `boolean` | 是否显示列设置按钮 |
| cacheKey | `string` | 列操作缓存 key（用于持久化列设置） |
| emptyColumnValue | `React.ReactNode` | 空值占位符 |
| toolBarRender | `() => React.ReactNode` | 工具栏自定义渲染 |
| request | `(pagination, filters, sorter) => Promise<{ datas: any[], count: number } \| any[]>` | 异步数据请求 |

### TableColumnProType

继承 `Omit<TableColumnType<T>, "ellipsis">`，额外扩展：

| 属性 | 类型 | 说明 |
|------|------|------|
| date | `boolean \| string` | 日期格式化，传 string 时作为 format |
| message | `React.ReactNode` | 列标题旁的提示信息 |
| format | `(value, record, index) => string` | 自定义格式化函数 |
| ellipsis | `boolean \| { showTitle?: boolean; rows?: number }` | 文本省略，rows 支持多行省略 |

### Ref — TableProRef

| 方法 | 说明 |
|------|------|
| reload() | 刷新表格（保持当前分页） |
| refresh() | 刷新表格（回到第一页） |

---
