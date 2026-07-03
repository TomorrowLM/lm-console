# 代码示例

页面开发工作流 Phase 4 各步骤的完整代码示例（TypeScript + React）。

## 4.1 类型定义

```typescript
// types.ts

/** 列表查询参数 */
export interface ListParams {
  /** 搜索关键词 */
  keyword?: string;
  /** 筛选字段 */
  filterField?: number;
  /** 分页参数 */
  page?: number;
  pageSize?: number;
}

/** 列表项 */
export interface ListItem {
  id: string | number;
  name: string;
  status: number;
  description?: string;
  // ... 其他字段
}

/** 列表响应 */
export interface ListResponse {
  data: ListItem[];
  total: number;
}
```

## 4.2 常量配置

```typescript
// constants.ts

/** 状态映射 */
export const STATUS_MAP: Record<number, { label: string; color: string }> = {
  1: { label: '进行中', color: 'blue' },
  2: { label: '已完成', color: 'green' },
  3: { label: '已取消', color: 'gray' },
};

/** 筛选选项配置 */
export const filterConfig = [
  {
    type: 'select',
    name: 'status',
    label: '状态筛选',
    options: [
      { label: '全部', value: '' },
      { label: '进行中', value: '1' },
      { label: '已完成', value: '2' },
    ],
  },
];
```

## 4.3 API 服务层

```typescript
// services/api.ts

import { request } from '@/utils/http';
import type { ListParams, ListResponse } from './types';

export const ApiService = {
  /** 获取列表数据 */
  getList: (params: ListParams) => {
    return request.post<ListResponse>('/api/xxx/list', params);
  },

  /** 获取详情 */
  getDetail: (id: string) => {
    return request.get(`/api/xxx/detail/${id}`);
  },
};
```

**原则：API 服务统一组织，按业务模块分类管理。**

## 4.4 数据管理模块（TDD 驱动）

在以下情况创建独立的数据管理模块：
- 有复杂的业务逻辑需要封装
- 需要管理多个状态和副作用
- 需要在多个页面/组件共享数据

### 红灯 — 先写失败测试

```typescript
// hooks/useListData.test.ts

import { renderHook, act, waitFor } from '@testing-library/react';
import { useListData } from './useListData';

test('loads list data on initialization', async () => {
  const { result } = renderHook(() => useListData());
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toHaveLength(2);
});

test('resets to page 1 when searching', () => {
  const { result } = renderHook(() => useListData());
  act(() => result.current.handleSearch({ keyword: 'test' }));
  expect(result.current.params.page).toBe(1);
});
```

**验证红灯** → 确认测试因功能缺失而失败。

### 绿灯 — 最少代码

```typescript
// hooks/useListData.ts

import { useState, useCallback } from 'react';
import { ApiService } from '@/services/api';
import type { ListParams, ListItem } from '../types';

export function useListData() {
  const [data, setData] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [params, setParams] = useState<ListParams>({ page: 1, pageSize: 10 });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ApiService.getList(params);
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const handleSearch = (newParams: ListParams) => {
    setParams({ ...newParams, page: 1 });
  };

  const handleReset = () => {
    setParams({ page: 1, pageSize: 10 });
  };

  return { data, loading, loadData, handleSearch, handleReset, params };
}
```

**验证绿灯** → 确认所有测试通过。**重构（如需要）**

## 4.5 UI 组件（TDD 驱动）

封装可复用的列表项或卡片组件。

### 红灯 — 先写失败测试

```typescript
// components/ItemCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import ItemCard from './ItemCard';

test('displays status label from STATUS_MAP', () => {
  render(<ItemCard item={{ id: '1', name: '测试项', status: 1 }} />);
  expect(screen.getByText('进行中')).toBeInTheDocument();
});

test('calls onClick with item when clicked', () => {
  const handleClick = jest.fn();
  const item = { id: '1', name: '测试项', status: 1 };
  render(<ItemCard item={item} onClick={handleClick} />);
  fireEvent.click(screen.getByRole('button', { name: '去处理' }));
  expect(handleClick).toHaveBeenCalledWith(item);
});
```

### 绿灯 — 最少代码

```typescript
// components/ItemCard.tsx

import React from 'react';
import { STATUS_MAP } from '../constants';
import type { ListItem } from '../types';

interface ItemCardProps {
  item: ListItem;
  onClick?: (item: ListItem) => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  const statusConfig = STATUS_MAP[item.status] || STATUS_MAP[0];

  const handleClick = () => {
    onClick?.(item);
  };

  return (
    <div className="card" onClick={handleClick}>
      <span className="status-badge" style={{ color: statusConfig.color }}>
        {statusConfig.label}
      </span>
      <h3>{item.name}</h3>
      {item.description && <p>{item.description}</p>}
      <button className="action-btn">去处理</button>
    </div>
  );
};

export default ItemCard;
```

## 4.6 页面主入口（TDD 驱动）

整合所有组件，完成页面功能。

### 红灯 — 先写失败测试

```typescript
// PageName.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import PageName from './PageName';
import { ApiService } from '@/services/api';

test('renders search filter and list on load', async () => {
  render(<PageName />);
  expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('list')).toBeInTheDocument());
});

test('shows empty state when no data', async () => {
  jest.spyOn(ApiService, 'getList').mockResolvedValue({ data: [], total: 0 });
  render(<PageName />);
  await waitFor(() => expect(screen.getByText('暂无数据')).toBeInTheDocument());
});
```

### 绿灯 — 最少代码

```typescript
// PageName.tsx

import React, { useEffect } from 'react';
import SearchFilter from '@/components/SearchFilter';
import ListComponent from '@/components/ListComponent';
import ItemCard from './components/ItemCard';
import { filterConfig } from './constants';
import { useListData } from './hooks/useListData';

const PageName: React.FC = () => {
  const { data, loading, loadData, handleSearch, handleReset } = useListData();

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="page-container">
      <SearchFilter
        config={filterConfig}
        placeholder="搜索..."
        onSearch={handleSearch}
        onReset={handleReset}
      />
      <ListComponent
        data={data}
        loading={loading}
        renderItem={(item) => <ItemCard key={item.id} item={item} />}
        onLoadMore={loadData}
        emptyText="暂无数据"
      />
    </div>
  );
};

export default PageName;
```
