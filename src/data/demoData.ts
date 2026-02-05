// Demo data for guest mode
export const demoTransactions = [
  {
    id: 'demo-1',
    description: 'Stipendio Gennaio',
    amount: 2500,
    type: 'income',
    date: new Date().toISOString().split('T')[0],
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    recurring: null,
    start_date: null,
    end_date: null,
    is_partial: false,
    paid_amount: null,
    attachment_url: null
  },
  {
    id: 'demo-2',
    description: 'Affitto',
    amount: 800,
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    recurring: 'monthly',
    start_date: null,
    end_date: null,
    is_partial: false,
    paid_amount: null,
    attachment_url: null
  },
  {
    id: 'demo-3',
    description: 'Spesa supermercato',
    amount: 150,
    type: 'expense',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    recurring: null,
    start_date: null,
    end_date: null,
    is_partial: false,
    paid_amount: null,
    attachment_url: null
  },
  {
    id: 'demo-4',
    description: 'Bolletta luce',
    amount: 85,
    type: 'expense',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    recurring: 'monthly',
    start_date: null,
    end_date: null,
    is_partial: false,
    paid_amount: null,
    attachment_url: null
  },
  {
    id: 'demo-5',
    description: 'Bonus freelance',
    amount: 500,
    type: 'income',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    recurring: null,
    start_date: null,
    end_date: null,
    is_partial: false,
    paid_amount: null,
    attachment_url: null
  }
];

export const demoReminders = [
  {
    id: 'demo-r1',
    title: 'Scadenza assicurazione auto',
    description: 'Rinnovo polizza RCA',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 450,
    completed: false,
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    notify_days_before: 3
  },
  {
    id: 'demo-r2',
    title: 'Pagamento IMU',
    description: 'Prima rata IMU 2024',
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 280,
    completed: false,
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    notify_days_before: 5
  },
  {
    id: 'demo-r3',
    title: 'Rinnovo abbonamento palestra',
    description: 'Abbonamento annuale',
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: 600,
    completed: false,
    category_id: null,
    user_id: 'demo-user',
    created_at: new Date().toISOString(),
    notify_days_before: 7
  }
];

export const demoCategories = [
  { id: 'demo-cat-1', name: 'Stipendio', type: 'income', color: '#22c55e', icon: 'briefcase', is_default: true, user_id: null, created_at: new Date().toISOString() },
  { id: 'demo-cat-2', name: 'Casa', type: 'expense', color: '#f97316', icon: 'home', is_default: true, user_id: null, created_at: new Date().toISOString() },
  { id: 'demo-cat-3', name: 'Alimentari', type: 'expense', color: '#eab308', icon: 'shopping-cart', is_default: true, user_id: null, created_at: new Date().toISOString() },
  { id: 'demo-cat-4', name: 'Utenze', type: 'expense', color: '#3b82f6', icon: 'zap', is_default: true, user_id: null, created_at: new Date().toISOString() },
  { id: 'demo-cat-5', name: 'Freelance', type: 'income', color: '#a855f7', icon: 'laptop', is_default: true, user_id: null, created_at: new Date().toISOString() }
];
