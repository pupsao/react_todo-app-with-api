import React, { useEffect, useRef, useState } from 'react';
import cn from 'classnames';
import { Todo } from '../types/Todo';

interface Props {
  todo: Todo;
  onDelete: (id: number) => void;
  isLoading: boolean;
  onUpdate: (todo: Todo) => Promise<void>;
  onToggle: (id: number) => void;
}

export const TodoItem: React.FC<Props> = ({
  todo,
  onDelete = () => {},
  isLoading,
  onToggle,
  onUpdate = () => Promise.resolve(),
}) => {
  const { id, title, completed } = todo;

  const [editing, setEditing] = useState<boolean>(false);
  const [editedTitle, setEditedTitle] = useState<string>(title);

  const editInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      editInput.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    setEditedTitle(todo.title);
  }, [todo.title]);

  const savedTodo = () => {
    if (isLoading) {
      return;
    }

    const trimmedTitle = editedTitle.trim();

    if (!trimmedTitle) {
      onDelete(id);

      return;
    }

    if (trimmedTitle === title) {
      setEditing(false);

      return;
    }

    onUpdate({ ...todo, title: trimmedTitle })
      .then(() => {
        setEditing(false);
      })
      .catch(() => {
        editInput.current?.focus();
      });
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setEditing(false);
      setEditedTitle(title);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    savedTodo();
  };

  return (
    <div
      data-cy="Todo"
      className={cn('todo', { completed: completed })}
      key={id}
    >
      <label className="todo__status-label">
        {}
        <input
          data-cy="TodoStatus"
          type="checkbox"
          className="todo__status"
          checked={completed}
          onChange={() => onToggle(id)}
        />
      </label>

      {editing ? (
        <form onSubmit={handleSubmit}>
          <input
            data-cy="TodoTitleField"
            type="text"
            className="todo__title-field"
            ref={editInput}
            value={editedTitle}
            onChange={e => setEditedTitle(e.target.value)}
            onBlur={savedTodo}
            onKeyUp={handleKeyUp}
          />
        </form>
      ) : (
        <span
          data-cy="TodoTitle"
          className="todo__title"
          onDoubleClick={() => {
            setEditing(true);
            setEditedTitle(todo.title);
          }}
        >
          {todo.title}
        </span>
      )}

      {!editing && (
        <button
          type="button"
          className="todo__remove"
          data-cy="TodoDelete"
          onClick={() => onDelete(todo.id)}
        >
          ×
        </button>
      )}

      {/* overlay will cover the todo while it is being deleted or updated */}
      <div
        data-cy="TodoLoader"
        className={cn('modal overlay', { 'is-active': isLoading })}
      >
        <div className="modal-background has-background-white-ter" />
        <div className="loader" />
      </div>
    </div>
  );
};
