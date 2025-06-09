# Flutter Implementation Guide

## 1. Authentication System
- **Google OAuth**:
  - Uses server-side flow with redirect
  - Token refresh mechanism
  - Error handling for session termination and invalid tokens
- **UI Components**:
  - Login card with responsive design
  - Error display for authentication failures
  - Loading states during authentication

## 2. Chat Architecture
- **Message Structure**:
```dart
class Message {
  final String id;
  final String role; // 'user' or 'assistant'
  final String content;
  final bool isLoading;
  final DateTime? timestamp;
}
```
- **Chat Session Management**:
  - Per-chat model selection
  - Message history loading
  - New chat creation flow

## 3. State Management (Flutter Equivalent)
- **Streaming State**:
  - Use `StreamController` for message streaming
  - Implement `AbortController` pattern for cancellation
- **Chat Context**:
  - Use `Provider` or `Riverpod` for global state
  - Track active chat ID and UI focus
- **Message Updates**:
  - Immutable message lists
  - Optimistic updates for better UX

## 4. UI Components
- **Message List**:
  - Different styling for user/assistant messages
  - Markdown rendering for content
  - Copy functionality
- **Input Bar**:
  - Model selection dropdown
  - Send button with loading state
- **Layout**:
  - Responsive design for mobile/desktop
  - Scroll-to-bottom functionality
  - Loading indicators

## 5. API Integration
- **Endpoints**:
  - `/auth/google` - Google OAuth
  - `/api/stream` - Message streaming
  - `/api/history/{chatId}` - Chat history
- **Request Structure**:
```dart
{
  "chatId": "string",
  "message": "string", 
  "provider": "string",
  "model": "string",
  "systemPrompt": "string"
}
```
- **Response Handling**:
  - Event-stream parsing
  - Error handling
  - Usage metrics

## 6. Error Handling
- **Authentication Errors**:
  - Session termination
  - Token expiration
- **Chat Errors**:
  - Stream failures
  - History loading failures
  - Model selection errors
- **UI Feedback**:
  - Toast notifications
  - Inline error messages
  - Loading states

## Detailed React Remix to Flutter Comparison

### 1. Routing & Navigation
**React Remix**:
- File-based routing (`app/routes/*.tsx`)
- Nested layouts with `__app.tsx` as root layout
- Navigation using `useNavigate()` hook
- Route loaders for data fetching

**Flutter Equivalent**:
- Use `go_router` or `auto_route` for declarative routing
- Create equivalent route structure:
  ```dart
  GoRoute(
    path: '/chat/:chatId',
    builder: (context, state) => ChatScreen(
      chatId: state.pathParameters['chatId']!,
    ),
  )
  ```
- Navigation using `context.go()` or generated router

### 2. State Management
**React Remix**:
- Context API (`createContext`) for chat state
- Custom hooks (`useStreamingChat`)
- Local state with `useState`
- Server-side state with loaders

**Flutter Equivalent**:
- `Riverpod` for global state (equivalent to Context)
- StateNotifier for complex state logic
- `StatefulWidget` for local UI state
- Combine with `dio` for API calls

### 3. Component Architecture
**React Remix**:
- Functional components with hooks
- Composition pattern (e.g., `<Card><CardHeader>`)
- Tailwind CSS for styling

**Flutter Equivalent**:
- Widget composition:
  ```dart
  Card(
    child: Column(
      children: [
        CardHeader(title: 'Title'),
        CardContent(...),
      ],
    ),
  )
  ```
- Use `Theme` and custom styles
- Consider `flutter_hooks` for hook-like syntax

### 4. Data Fetching
**React Remix**:
- `loader` functions for route data
- `fetch` API for streaming
- `useLoaderData()` hook

**Flutter Equivalent**:
- `FutureBuilder` for one-time data
- `StreamBuilder` for real-time updates
- Repository pattern for API abstraction

### 5. Authentication Flow
**React Remix**:
- Server-side auth with cookies
- `checkAuth` loader
- Token refresh mechanism

**Flutter Equivalent**:
- `google_sign_in` package
- Secure storage for tokens
- Implement token refresh:
  ```dart
  final auth = GoogleSignIn(
    scopes: ['email', 'profile'],
  );
  ```

### 6. UI Implementation Examples

**Message Item (React)**:
```tsx
function MessageItem({ message }) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Message content */}
    </div>
  );
}
```

**Flutter Equivalent**:
```dart
class MessageItem extends StatelessWidget {
  final Message message;
  
  Widget build(BuildContext context) {
    return Align(
      alignment: message.isUser
        ? Alignment.centerRight
        : Alignment.centerLeft,
      child: /* Message content */,
    );
  }
}
```

### Performance Considerations
1. **Message Lists**:
   - React: Virtualized lists via CSS
   - Flutter: Use `ListView.builder` with `itemExtent`

2. **Streaming**:
   - React: EventSource API
   - Flutter: `dio` with responseType: ResponseType.stream

3. **State Updates**:
   - React: Immutable updates with `setMessages`
   - Flutter: Immutable models with `freezed`