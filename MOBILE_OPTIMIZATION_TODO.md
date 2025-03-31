# Mobile Optimization TODOs for Team Builder

## High Priority

- [x] **Implement Virtualization for Player Lists**
  - Add `react-window` or `react-virtualized` to efficiently render only visible players
  - Replace current scrollable list with virtualized list component
  - Example: `npm install react-window`

- [x] **Optimize Image Loading**
  - Implement progressive/lazy loading for player images
  - Use smaller image sizes for mobile devices
  - Add placeholder images during loading
  - Created imageOptimization utility with automatic device detection

- [x] **Reduce Re-renders**
  - Add `React.memo()` to player card components
  - Optimize dependency arrays in useEffect and useMemo hooks
  - Consider using useReducer instead of multiple useState calls

- [x] **Debounce Search Input**
  - Add debouncing to search field to prevent excessive filtering on each keystroke
  - `npm install lodash.debounce`

## Medium Priority

- [x] **Implement Mobile-Specific View**
  - Create simplified layout for mobile screens
  - Reduce number of players loaded per page on mobile (10-15 vs 20)
  - Adjust UI elements for better touch interactions

- [x] **Optimize Memoization**
  - Review and improve useMemo dependencies
  - Add useCallback for event handlers
  - Added custom useMemoizedCallback and useDeepMemoizedCallback hooks for better performance

- [x] **Reduce Data Processing**
  - Move expensive calculations to web workers if possible
  - Cache filtered and sorted player lists
  - Implemented ComputationCache and web worker utilities

- [x] **Code Splitting**
  - Use dynamic imports for heavy components
  - Lazy load components not visible on initial render
  - Created TeamBuilderLoader with lazy loading and Suspense

## Low Priority

- [x] **Clean Up Console Logging**
  - Remove excessive logging in production builds
  - Add conditional logging based on environment
  - Implemented a `logger` utility with production controls
  - Added developer keyboard shortcut (Alt+Shift+D) to toggle debug mode

- [x] **Performance Monitoring**
  - Add performance metrics tracking
  - Implement React Profiler in development
  - Created comprehensive performance monitoring utility

## Technical Implementation Notes

### Virtualization Example
```tsx
import { FixedSizeList } from 'react-window';

// In the renderPlayerSelection function:
const PlayerList = ({ items }) => (
  <FixedSizeList
    height={500}
    width="100%"
    itemCount={items.length}
    itemSize={70}
  >
    {({ index, style }) => (
      <div style={style}>
        {renderPlayerItem(items[index])}
      </div>
    )}
  </FixedSizeList>
);
```

### Debounced Search Example
```tsx
import { debounce } from 'lodash';

// In your component:
const debouncedSetSearch = useCallback(
  debounce((value) => setSearchTerm(value), 300),
  []
);

// In JSX:
<input
  onChange={(e) => debouncedSetSearch(e.target.value)}
  // other props
/>
```

### Mobile Detection Utility
```tsx
export const isMobile = () => {
  return window.innerWidth < 768;
};

// Usage in component
const playersPerPage = isMobile() ? 10 : 20;
```

### Logger Implementation
```tsx
// Logger utility with production controls
const logger = {
  log: (message) => {
    if (process.env.NODE_ENV !== 'production' || window.debugEnabled) {
      console.log(message);
    }
  }
  // ... other methods
};

// Enable debugging with keyboard shortcut
useEffect(() => {
  const handler = (e) => {
    if (e.altKey && e.shiftKey && e.key === 'D') {
      window.debugEnabled = !window.debugEnabled;
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

### Web Worker Implementation
```tsx
// Create a web worker for expensive calculations
const filterPlayersWorker = createWorker((data) => {
  const { players, filters } = data;
  // Perform expensive filtering and sorting here
  return filteredPlayers;
});

// Use with memoization
const memoizedFilterPlayers = createMemoizedWorker(filterPlayersFunction);

// In component:
useEffect(() => {
  memoizedFilterPlayers({ players, filters })
    .then(result => setFilteredPlayers(result));
}, [players, filters]);
```

### Performance Monitoring
```tsx
// In your main app component
useEffect(() => {
  // Set up performance monitoring
  const unsubscribe = setupPerformanceMonitoring();
  return unsubscribe;
}, []);

// In specific components
useComponentRenderTimer('TeamBuilder');

// For API calls
const fetchData = async () => {
  const data = await measureApiCall('fetchPlayers', fetch('/api/players'));
  return data;
};
``` 