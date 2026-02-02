/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import cn from 'classnames';
import { UserWarning } from './UserWarning';
import {
  createNewTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  USER_ID,
} from './api/todos';
import { Todo } from './types/Todo';
import { Header } from './components/Header';
import { TodoList } from './components/TodoList';
import { Footer } from './components/Footer';
import { FilterType } from './types/filterType';
import { ErrorMessages } from './types/Errors';

export const App: React.FC = () => {
  const inputField = useRef<HTMLInputElement | null>(null);

  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<ErrorMessages | null>(null);
  const [filter, setFilter] = useState<FilterType>(FilterType.All);

  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const [processingId, setProcessingId] = useState<number[]>([]);

  const hasTodos = todos.length > 0;

  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case FilterType.Active:
        return !todo.completed;
      case FilterType.Completed:
        return todo.completed;
      case FilterType.All:
      default:
        return true;
    }
  });

  useEffect(() => {
    setError(null);
    setLoading(true);

    getTodos()
      .then(setTodos)
      .catch(() => {
        setError(ErrorMessages.LoadTodos);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!error) {
      return;
    }

    const errorTimer = setTimeout(() => {
      setError(null);
    }, 3000);

    return () => clearTimeout(errorTimer);
  }, [error]);

  const closeError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!loading) {
      inputField.current?.focus();
    }
  }, [loading]);

  const allTodosIsComplited = useMemo(
    () => todos.every(todo => todo.completed) && todos.length > 0,
    [todos],
  );

  const todoIsComplited = useMemo(
    () => todos.some(todo => todo.completed),
    [todos],
  );

  const activeTodosCount = useMemo(
    () => todos.filter(todo => !todo.completed).length,
    [todos],
  );

  const handleCreateTodo = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError(ErrorMessages.EmptyTitle);
      inputField.current?.focus();

      return;
    }

    setLoading(true);

    const tempTodoElement: Todo = {
      userId: USER_ID,
      id: 0,
      title: trimmedTitle,
      completed: false,
    };

    setTempTodo(tempTodoElement);

    createNewTodo(trimmedTitle)
      .then(newTodo => {
        setTodos(prevTodos => [...prevTodos, newTodo]);
        setTitle('');
      })
      .catch(() => setError(ErrorMessages.AddTodo))
      .finally(() => {
        setTempTodo(null);
        setLoading(false);
      });
  };

  const handleUpdateTodo = (todo: Todo) => {
    setProcessingId(prevId => [...prevId, todo.id]);

    return updateTodo(todo)
      .then(updatedTodo => {
        setTodos(prev =>
          prev.map(todoMatch =>
            todoMatch.id === todo.id ? updatedTodo : todoMatch,
          ),
        );
      })
      .catch(err => {
        setError(ErrorMessages.ToUpdate);
        throw err;
      })
      .finally(() => {
        setProcessingId(ids => ids.filter(id => id !== todo.id));
      });
  };

  const handleToggleTodo = (id: number) => {
    const todoToToggle = todos.find(todo => todo.id === id);

    if (todoToToggle) {
      handleUpdateTodo({ ...todoToToggle, completed: !todoToToggle.completed });
    }
  };

  const handleToggleAll = () => {
    const shouldComplete = !allTodosIsComplited;

    const idsToUpdate = todos
      .filter(todo => todo.completed !== shouldComplete)
      .map(t => t.id);

    setProcessingId(prev => [...prev, ...idsToUpdate]);

    Promise.allSettled(
      todos
        .filter(todo => idsToUpdate.includes(todo.id))
        .map(todo => updateTodo({ ...todo, completed: shouldComplete })),
    )
      .then(result => {
        if (result.some(r => r.status === 'rejected')) {
          setError(ErrorMessages.ToUpdateSome);
        }

        setTodos(curr =>
          curr.map(todo => {
            if (idsToUpdate.includes(todo.id)) {
              return { ...todo, completed: shouldComplete };
            }

            return todo;
          }),
        );
      })
      .finally(() => {
        setProcessingId(prev => prev.filter(id => !idsToUpdate.includes(id)));
      });
  };

  const handleDeleteTodo = (id: number) => {
    setProcessingId(prev => [...prev, id]);

    deleteTodo(id)
      .then(() => {
        setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
        inputField.current?.focus();
      })
      .catch(() => setError(ErrorMessages.DeleteTodo))
      .finally(() => {
        setProcessingId(prev => prev.filter(todoId => todoId !== id));
      });
  };

  const handleRemoveAllCompleted = () => {
    todos.filter(t => t.completed).forEach(todo => handleDeleteTodo(todo.id));
  };

  if (!USER_ID) {
    return <UserWarning />;
  }

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <Header
          activeTodo={allTodosIsComplited}
          title={title}
          setTitle={setTitle}
          inputField={inputField}
          loading={loading}
          onTodoAdd={handleCreateTodo}
          toggleAll={handleToggleAll}
          hasTodos={hasTodos}
        />
        {hasTodos && (
          <TodoList
            todos={filteredTodos}
            tempTodo={tempTodo}
            onDelete={handleDeleteTodo}
            onToggle={handleToggleTodo}
            onUpdate={handleUpdateTodo}
            processingIds={processingId}
          />
        )}

        {hasTodos && (
          <Footer
            filter={filter}
            setFilter={setFilter}
            todoIsComplited={todoIsComplited}
            activeTodosCount={activeTodosCount}
            onClearCompleted={handleRemoveAllCompleted}
          />
        )}
      </div>

      {/* DON'T use conditional rendering to hide the notification */}
      {/* Add the 'hidden' class to hide the message smoothly */}
      <div
        data-cy="ErrorNotification"
        className={cn(
          'notification is-danger is-light has-text-weight-normal',
          { hidden: !error },
        )}
      >
        <button
          data-cy="HideErrorButton"
          type="button"
          className="delete"
          onClick={() => setError(null)}
        />
        {/* show only one message at a time */}

        {error}
      </div>
    </div>
  );
};
