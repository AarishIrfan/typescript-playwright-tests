import { test, expect, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('https://demo.playwright.dev/todomvc');
});

const TODO_ITEMS = [
  'buy some cheese',
  'feed the cat',
  'book a doctors appointment'
] as const;

// --- Helper functions ---
async function createDefaultTodos(page: Page) {
  const newTodo = page.getByPlaceholder('What needs to be done?');
  for (const item of TODO_ITEMS) {
    await newTodo.fill(item);
    await newTodo.press('Enter');
  }
}

async function checkNumberOfTodosInLocalStorage(page: Page, expected: number) {
  return await page.waitForFunction(e => {
    try {
      return JSON.parse(localStorage['react-todos'] || '[]').length === e;
    } catch {
      return false;
    }
  }, expected);
}

async function checkNumberOfCompletedTodosInLocalStorage(page: Page, expected: number) {
  return await page.waitForFunction(e => {
    try {
      return JSON.parse(localStorage['react-todos'] || '[]').filter((todo: any) => todo.completed).length === e;
    } catch {
      return false;
    }
  }, expected);
}

async function checkTodosInLocalStorage(page: Page, title: string) {
  return await page.waitForFunction(t => {
    try {
      return JSON.parse(localStorage['react-todos'] || '[]').map((todo: any) => todo.title).includes(t);
    } catch {
      return false;
    }
  }, title);
}

// --- Tests ---

test.describe('New Todo', () => {
  test('@smoke should allow me to add todo items', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-title')).toHaveText([TODO_ITEMS[0]]);
    await newTodo.fill(TODO_ITEMS[1]);
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-title')).toHaveText([
      TODO_ITEMS[0],
      TODO_ITEMS[1]
    ]);
    await checkNumberOfTodosInLocalStorage(page, 2);
  });

  test('should clear text input field when an item is added', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press('Enter');
    await expect(newTodo).toBeEmpty();
    await checkNumberOfTodosInLocalStorage(page, 1);
  });

  test('should append new items to the bottom of the list', async ({ page }) => {
    await createDefaultTodos(page);
    const todoCount = page.getByTestId('todo-count');
    await expect(page.getByText('3 items left')).toBeVisible();
    await expect(todoCount).toHaveText('3 items left');
    await expect(todoCount).toContainText('3');
    await expect(todoCount).toHaveText(/3/);
    await expect(page.getByTestId('todo-title')).toHaveText(TODO_ITEMS);
    await checkNumberOfTodosInLocalStorage(page, 3);
  });
});

test.describe('Edge cases and UI feedback', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page);
  });

  test('should not add empty todo items', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill('');
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-item')).toHaveCount(3);
  });

  test('should not add todo items with only whitespace', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill('    ');
    await newTodo.press('Enter');
    await expect(page.getByTestId('todo-item')).toHaveCount(3);
  });

  test('should focus input after adding a todo', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    await newTodo.fill('new task');
    await newTodo.press('Enter');
    await expect(newTodo).toBeFocused();
  });

  test('should not allow editing to empty string (removes item)', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(0).dblclick();
    await todoItems.nth(0).getByRole('textbox', { name: 'Edit' }).fill('');
    await todoItems.nth(0).getByRole('textbox', { name: 'Edit' }).press('Enter');
    await expect(page.getByTestId('todo-item')).toHaveCount(2);
  });

  test('should keep completed items after reload', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(2).getByRole('checkbox').check();
    await page.reload();
    await expect(todoItems.nth(2)).toHaveClass('completed');
  });

  test('should keep active items after reload', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(1).getByRole('checkbox').check();
    await page.reload();
    await expect(todoItems.nth(0)).not.toHaveClass('completed');
    await expect(todoItems.nth(2)).not.toHaveClass('completed');
  });

  test('should not show clear completed button if no completed todos', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeHidden();
  });

  test('should allow rapid toggling of all items', async ({ page }) => {
    const toggleAll = page.getByLabel('Mark all as complete');
    for (let i = 0; i < 5; i++) {
      await toggleAll.check();
      await expect(toggleAll).toBeChecked();
      await toggleAll.uncheck();
      await expect(toggleAll).not.toBeChecked();
    }
    await expect(page.getByTestId('todo-item')).toHaveClass(['', '', '']);
  });

  test('should allow deleting all items one by one', async ({ page }) => {
    const initialCount = await page.getByTestId('todo-item').count();
    for (let i = 0; i < initialCount; i++) {
      const firstItem = page.getByTestId('todo-item').first();
      await firstItem.hover();
      await firstItem.getByRole('button', { name: 'Delete' }).click();
      await expect(page.getByTestId('todo-item')).toHaveCount(initialCount - i - 1);
    }
    await expect(page.getByTestId('todo-item')).toHaveCount(0);
    const todoCounter = page.getByTestId('todo-count');
    try {
      await todoCounter.waitFor({ state: 'visible', timeout: 2000 });
      await expect(todoCounter).toHaveText('0 items left');
    } catch (error) {
      await expect(todoCounter).toBeHidden();
    }
  });
});

test.describe('Item', () => {
  test('should allow me to mark items as complete', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    for (const item of TODO_ITEMS.slice(0, 2)) {
      await newTodo.fill(item);
      await newTodo.press('Enter');
    }
    const firstTodo = page.getByTestId('todo-item').nth(0);
    await firstTodo.getByRole('checkbox').check();
    await expect(firstTodo).toHaveClass('completed');
    const secondTodo = page.getByTestId('todo-item').nth(1);
    await expect(secondTodo).not.toHaveClass('completed');
    await secondTodo.getByRole('checkbox').check();
    await expect(firstTodo).toHaveClass('completed');
    await expect(secondTodo).toHaveClass('completed');
  });

  test('should allow me to un-mark items as complete', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    for (const item of TODO_ITEMS.slice(0, 2)) {
      await newTodo.fill(item);
      await newTodo.press('Enter');
    }
    const firstTodo = page.getByTestId('todo-item').nth(0);
    const secondTodo = page.getByTestId('todo-item').nth(1);
    const firstTodoCheckbox = firstTodo.getByRole('checkbox');
    await firstTodoCheckbox.check();
    await expect(firstTodo).toHaveClass('completed');
    await expect(secondTodo).not.toHaveClass('completed');
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);
    await firstTodoCheckbox.uncheck();
    await expect(firstTodo).not.toHaveClass('completed');
    await expect(secondTodo).not.toHaveClass('completed');
    await checkNumberOfCompletedTodosInLocalStorage(page, 0);
  });

  test('should allow me to edit an item', async ({ page }) => {
    await createDefaultTodos(page);
    const todoItems = page.getByTestId('todo-item');
    const secondTodo = todoItems.nth(1);
    await secondTodo.dblclick();
    await expect(secondTodo.getByRole('textbox', { name: 'Edit' })).toHaveValue(TODO_ITEMS[1]);
    await secondTodo.getByRole('textbox', { name: 'Edit' }).fill('buy some sausages');
    await secondTodo.getByRole('textbox', { name: 'Edit' }).press('Enter');
    await expect(todoItems).toHaveText([
      TODO_ITEMS[0],
      'buy some sausages',
      TODO_ITEMS[2]
    ]);
    await checkTodosInLocalStorage(page, 'buy some sausages');
  });
});

test.describe('Editing', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page);
    await checkNumberOfTodosInLocalStorage(page, 3);
  });

  test('should hide other controls when editing', async ({ page }) => {
    const todoItem = page.getByTestId('todo-item').nth(1);
    await todoItem.dblclick();
    await expect(todoItem.getByRole('checkbox')).not.toBeVisible();
    await expect(todoItem.locator('label', { hasText: TODO_ITEMS[1] })).not.toBeVisible();
    await checkNumberOfTodosInLocalStorage(page, 3);
  });

  test('should save edits on blur', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(1).dblclick();
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).fill('buy some sausages');
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).dispatchEvent('blur');
    await expect(todoItems).toHaveText([
      TODO_ITEMS[0],
      'buy some sausages',
      TODO_ITEMS[2],
    ]);
    await checkTodosInLocalStorage(page, 'buy some sausages');
  });

  test('should trim entered text', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(1).dblclick();
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).fill('    buy some sausages    ');
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter');
    await expect(todoItems).toHaveText([
      TODO_ITEMS[0],
      'buy some sausages',
      TODO_ITEMS[2],
    ]);
    await checkTodosInLocalStorage(page, 'buy some sausages');
  });

  test('should remove the item if an empty text string was entered', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(1).dblclick();
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).fill('');
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).press('Enter');
    await expect(todoItems).toHaveText([
      TODO_ITEMS[0],
      TODO_ITEMS[2],
    ]);
  });

  test('should cancel edits on escape', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(1).dblclick();
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).fill('buy some sausages');
    await todoItems.nth(1).getByRole('textbox', { name: 'Edit' }).press('Escape');
    await expect(todoItems).toHaveText(TODO_ITEMS);
  });
});

test.describe('Counter', () => {
  test('should display the current number of todo items', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    const todoCount = page.getByTestId('todo-count');
    await newTodo.fill(TODO_ITEMS[0]);
    await newTodo.press('Enter');
    await expect(todoCount).toContainText('1');
    await newTodo.fill(TODO_ITEMS[1]);
    await newTodo.press('Enter');
    await expect(todoCount).toContainText('2');
    await checkNumberOfTodosInLocalStorage(page, 2);
  });
});

test.describe('Clear completed button', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page);
  });

  test('should display the correct text', async ({ page }) => {
    await page.locator('.todo-list li .toggle').first().check();
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeVisible();
  });

  test('should remove completed items when clicked', async ({ page }) => {
    const todoItems = page.getByTestId('todo-item');
    await todoItems.nth(1).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Clear completed' }).click();
    await expect(todoItems).toHaveCount(2);
    await expect(todoItems).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]]);
  });

  test('should be hidden when there are no items that are completed', async ({ page }) => {
    await page.locator('.todo-list li .toggle').first().check();
    await page.getByRole('button', { name: 'Clear completed' }).click();
    await expect(page.getByRole('button', { name: 'Clear completed' })).toBeHidden();
  });
});

test.describe('Persistence', () => {
  test('should persist its data', async ({ page }) => {
    const newTodo = page.getByPlaceholder('What needs to be done?');
    for (const item of TODO_ITEMS.slice(0, 2)) {
      await newTodo.fill(item);
      await newTodo.press('Enter');
    }
    const todoItems = page.getByTestId('todo-item');
    const firstTodoCheck = todoItems.nth(0).getByRole('checkbox');
    await firstTodoCheck.check();
    await expect(todoItems).toHaveText([TODO_ITEMS[0], TODO_ITEMS[1]]);
    await expect(firstTodoCheck).toBeChecked();
    await expect(todoItems).toHaveClass(['completed', '']);
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);
    await page.reload();
    await expect(todoItems).toHaveText([TODO_ITEMS[0], TODO_ITEMS[1]]);
    await expect(firstTodoCheck).toBeChecked();
    await expect(todoItems).toHaveClass(['completed', '']);
  });
});

test.describe('Routing', () => {
  test.beforeEach(async ({ page }) => {
    await createDefaultTodos(page);
    await checkTodosInLocalStorage(page, TODO_ITEMS[0]);
  });

  test('should allow me to display active items', async ({ page }) => {
    const todoItem = page.getByTestId('todo-item');
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);
    await page.getByRole('link', { name: 'Active' }).click();
    await expect(todoItem).toHaveCount(2);
    await expect(todoItem).toHaveText([TODO_ITEMS[0], TODO_ITEMS[2]]);
  });

  test('should respect the back button', async ({ page }) => {
    const todoItem = page.getByTestId('todo-item');
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);

    await test.step('Showing all items', async () => {
      await page.getByRole('link', { name: 'All' }).click();
      await expect(todoItem).toHaveCount(3);
    });

    await test.step('Showing active items', async () => {
      await page.getByRole('link', { name: 'Active' }).click();
    });

    await test.step('Showing completed items', async () => {
      await page.getByRole('link', { name: 'Completed' }).click();
    });

    await expect(todoItem).toHaveCount(1);
    await page.goBack();
    await expect(todoItem).toHaveCount(2);
    await page.goBack();
    await expect(todoItem).toHaveCount(3);
  });

  test('should allow me to display completed items', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);
    await page.getByRole('link', { name: 'Completed' }).click();
    await expect(page.getByTestId('todo-item')).toHaveCount(1);
  });

  test('should allow me to display all items', async ({ page }) => {
    await page.getByTestId('todo-item').nth(1).getByRole('checkbox').check();
    await checkNumberOfCompletedTodosInLocalStorage(page, 1);
    await page.getByRole('link', { name: 'Active' }).click();
    await page.getByRole('link', { name: 'Completed' }).click();
    await page.getByRole('link', { name: 'All' }).click();
    await expect(page.getByTestId('todo-item')).toHaveCount(3);
  });

  test('should highlight the currently applied filter', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'All' })).toHaveClass('selected');
    const activeLink = page.getByRole('link', { name: 'Active' });
    const completedLink = page.getByRole('link', { name: 'Completed' });
    await activeLink.click();
    await expect(activeLink).toHaveClass('selected');
    await completedLink.click();
    await expect(completedLink).toHaveClass('selected');
  });
});