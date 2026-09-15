/* ==========================================================================
   Akil's Expense Tracker - Left Sidebar, Dashboard Cards & PDF Engine
   ========================================================================== */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEYS = {
    SEGREGATIONS: 'akil_tracker_segregations_v7',
    TRANSACTIONS: 'akil_tracker_transactions_v7',
    SAVINGS_VAULT: 'akil_tracker_savings_vault_v7',
    PERSONAL_NOTES: 'akil_tracker_personal_notes_v5',
    FIREBASE_CONFIG: 'akil_tracker_firebase_config_v5',
    SECURITY_SETTINGS: 'akil_tracker_security_settings_v5'
  };

  // App State
  const state = {
    currency: '₹', // Fixed INR
    activeTab: 'dashboard',
    activeDetailSegregationId: null,
    segregations: [],
    transactions: [],
    savingsVault: [],
    personalNotes: [],
    firebaseConfig: null,
    db: null,
    auth: null,
    userId: null,
    isFirebaseOnline: false,
    authMode: 'SIGN_IN',
    isGuestMode: false,
    currentUser: null,
    securitySettings: {
      userId: 'Akil',
      password: '',
      isProtectionEnabled: false
    },
    isAppUnlocked: false
  };

  // DOM Elements
  const DOM = {};

  // Initialize App
  document.addEventListener('DOMContentLoaded', () => {
    cacheDOMElements();
    loadStateFromStorage();
    setupEventListeners();
    initFirebaseIfAvailable();
    renderAll();
    checkAppLockStatus();
  });

  function getCurrentMonthKey(dateObj = new Date()) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function formatMoney(amount) {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  }

  function cacheDOMElements() {
    // Auth Elements
    DOM.authView = document.getElementById('authView');
    DOM.authForm = document.getElementById('authForm');
    DOM.btnTabSignIn = document.getElementById('btnTabSignIn');
    DOM.btnTabSignUp = document.getElementById('btnTabSignUp');
    DOM.authEmailInput = document.getElementById('authEmailInput');
    DOM.authPasswordInput = document.getElementById('authPasswordInput');
    DOM.btnAuthSubmit = document.getElementById('btnAuthSubmit');
    DOM.btnGoogleSignIn = document.getElementById('btnGoogleSignIn');
    DOM.btnGuestMode = document.getElementById('btnGuestMode');
    DOM.authErrorMessage = document.getElementById('authErrorMessage');
    DOM.userInfoContainer = document.getElementById('userInfoContainer');
    DOM.userAuthEmail = document.getElementById('userAuthEmail');
    DOM.btnSignOut = document.getElementById('btnSignOut');
    DOM.btnShowAuthModal = document.getElementById('btnShowAuthModal');

    // Settings & Lock Screen Elements
    DOM.settingsSecurityForm = document.getElementById('settingsSecurityForm');
    DOM.settingsUserIdInput = document.getElementById('settingsUserIdInput');
    DOM.settingsPasswordInput = document.getElementById('settingsPasswordInput');
    DOM.settingsConfirmPasswordInput = document.getElementById('settingsConfirmPasswordInput');
    DOM.settingsEnableLockToggle = document.getElementById('settingsEnableLockToggle');
    DOM.btnSaveSecuritySettings = document.getElementById('btnSaveSecuritySettings');
    DOM.btnLockAppNow = document.getElementById('btnLockAppNow');
    DOM.btnLockAppSidebar = document.getElementById('btnLockAppSidebar');

    DOM.lockScreenView = document.getElementById('lockScreenView');
    DOM.lockScreenForm = document.getElementById('lockScreenForm');
    DOM.lockScreenPasswordInput = document.getElementById('lockScreenPasswordInput');
    DOM.lockScreenUserLabel = document.getElementById('lockScreenUserLabel');
    DOM.lockScreenSubtitle = document.getElementById('lockScreenSubtitle');
    DOM.lockScreenError = document.getElementById('lockScreenError');
    DOM.btnUnlockApp = document.getElementById('btnUnlockApp');

    DOM.btnCloudSync = document.getElementById('btnCloudSync');
    DOM.cloudSyncBadge = document.getElementById('cloudSyncBadge');
    
    // Top Right Corner Plus Button & Title
    DOM.brandTitle = document.getElementById('brandTitle');
    DOM.topPageTitle = document.getElementById('topPageTitle');
    DOM.btnTopPlusAction = document.getElementById('btnTopPlusAction');
    
    // Plus Choice Modal
    DOM.modalPlusAction = document.getElementById('modalPlusAction');
    DOM.btnChoiceAddExisting = document.getElementById('btnChoiceAddExisting');
    DOM.btnChoiceAddNewSegregation = document.getElementById('btnChoiceAddNewSegregation');

    // Sidebar Nav Links
    DOM.navTabs = document.querySelectorAll('.nav-link-btn');
    DOM.tabContents = document.querySelectorAll('.tab-content');

    // Dashboard Elements
    DOM.notebookGrandTotal = document.getElementById('notebookGrandTotal');
    DOM.notebookSegregationsList = document.getElementById('notebookSegregationsList');

    // Savings Vault Tab
    DOM.savingsVaultTotalDisplay = document.getElementById('savingsVaultTotalDisplay');
    DOM.savingsPassbookBody = document.getElementById('savingsPassbookBody');

    // Transaction History Tab & Filters
    DOM.filterMonth = document.getElementById('filterMonth');
    DOM.filterSegregation = document.getElementById('filterSegregation');
    DOM.filterType = document.getElementById('filterType');
    DOM.btnClearFilters = document.getElementById('btnClearFilters');
    DOM.bankStatementBody = document.getElementById('bankStatementBody');
    DOM.btnDownloadPDF = document.getElementById('btnDownloadPDF');

    // My Notes Tab
    DOM.personalNoteTitleInput = document.getElementById('personalNoteTitleInput');
    DOM.personalNoteAmountInput = document.getElementById('personalNoteAmountInput');
    DOM.btnSavePersonalNote = document.getElementById('btnSavePersonalNote');
    DOM.savedNotesContainer = document.getElementById('savedNotesContainer');

    // Detail Modal
    DOM.modalSegregationDetail = document.getElementById('modalSegregationDetail');
    DOM.detailSegregationTitle = document.getElementById('detailSegregationTitle');
    DOM.detailAllocatedFund = document.getElementById('detailAllocatedFund');
    DOM.detailTotalSpent = document.getElementById('detailTotalSpent');
    DOM.detailRemainingFund = document.getElementById('detailRemainingFund');
    DOM.btnQuickAddBucketExpense = document.getElementById('btnQuickAddBucketExpense');
    DOM.btnTopUpBucketFund = document.getElementById('btnTopUpBucketFund');
    DOM.btnEditSegregationSettings = document.getElementById('btnEditSegregationSettings');
    DOM.btnDeleteSegregation = document.getElementById('btnDeleteSegregation');
    DOM.detailTransactionsTableBody = document.getElementById('detailTransactionsTableBody');

    // Modals
    DOM.modalTransaction = document.getElementById('modalTransaction');
    DOM.transactionForm = document.getElementById('transactionForm');
    DOM.transactionModalTitle = document.getElementById('transactionModalTitle');
    DOM.txIdInput = document.getElementById('txIdInput');
    DOM.txTypeSelect = document.getElementById('txTypeSelect');
    DOM.txSegregationSelect = document.getElementById('txSegregationSelect');
    DOM.txSegregationReadOnly = document.getElementById('txSegregationReadOnly');
    DOM.txAmountInput = document.getElementById('txAmountInput');
    DOM.txDateInput = document.getElementById('txDateInput');
    DOM.txNoteInput = document.getElementById('txNoteInput');

    DOM.modalSegregation = document.getElementById('modalSegregation');
    DOM.segregationForm = document.getElementById('segregationForm');
    DOM.segregationModalTitle = document.getElementById('segregationModalTitle');
    DOM.segIdInput = document.getElementById('segIdInput');
    DOM.segNameInput = document.getElementById('segNameInput');
    DOM.segAllocatedInput = document.getElementById('segAllocatedInput');

    DOM.modalFirebase = document.getElementById('modalFirebase');
    DOM.firebaseForm = document.getElementById('firebaseForm');
    DOM.firebaseConfigInput = document.getElementById('firebaseConfigInput');
    DOM.firebaseStatusMessage = document.getElementById('firebaseStatusMessage');
    DOM.btnDisableFirebase = document.getElementById('btnDisableFirebase');
    DOM.modalAlert = document.getElementById('modalAlert');
    DOM.modalAlertTitle = document.getElementById('modalAlertTitle');
    DOM.modalAlertMessage = document.getElementById('modalAlertMessage');
    
    DOM.toastContainer = document.getElementById('toastContainer');
  }

  function loadStateFromStorage() {
    // Clear legacy v5 and v6 sample data
    localStorage.removeItem('akil_tracker_segregations_v5');
    localStorage.removeItem('akil_tracker_transactions_v5');
    localStorage.removeItem('akil_tracker_savings_vault_v5');
    localStorage.removeItem('akil_tracker_segregations_v6');
    localStorage.removeItem('akil_tracker_transactions_v6');
    localStorage.removeItem('akil_tracker_savings_vault_v6');

    state.segregations = [];
    state.savingsVault = [];
    state.transactions = [];

    saveSegregationsToStorage();
    saveSavingsVaultToStorage();
    saveTransactionsToStorage();

    // Auto-sync any Savings Vault entry into Transaction History
    const savingsSeg = state.segregations.find(s => s.name.toLowerCase().includes('savings')) || state.segregations[0];
    if (savingsSeg && state.savingsVault.length > 0) {
      let txUpdated = false;
      state.savingsVault.forEach(vaultItem => {
        const exists = state.transactions.some(t => t.id === vaultItem.id || (t.amount === vaultItem.amount && t.note === vaultItem.particulars));
        if (!exists) {
          state.transactions.push({
            id: vaultItem.id || ('tx_sav_' + Date.now()),
            segregationId: savingsSeg.id,
            type: 'INCOME',
            amount: vaultItem.amount,
            date: vaultItem.date || new Date().toISOString().split('T')[0],
            monthKey: getCurrentMonthKey(new Date(vaultItem.date || Date.now())),
            note: vaultItem.particulars || 'Savings Deposit'
          });
          txUpdated = true;
        }
      });
      if (txUpdated) saveTransactionsToStorage();
    }

    const savedNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERSONAL_NOTES) || 'null');
    if (savedNotes && Array.isArray(savedNotes)) {
      state.personalNotes = savedNotes;
    } else {
      state.personalNotes = [
        {
          id: 'note_1',
          title: 'Buy New Shoes',
          amount: 1500,
          isCompleted: false,
          date: new Date().toISOString().split('T')[0]
        }
      ];
      saveNotesToStorage();
    }

    const savedFirebase = JSON.parse(localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG) || 'null');
    if (savedFirebase) {
      state.firebaseConfig = savedFirebase;
    } else {
      state.firebaseConfig = {
        apiKey: "AIzaSyDdNF0Kkh7ZAQQl44kr7jwXPr5B12jLvpQ",
        authDomain: "akils-expense-tracker.firebaseapp.com",
        projectId: "akils-expense-tracker",
        storageBucket: "akils-expense-tracker.firebasestorage.app",
        messagingSenderId: "587066139643",
        appId: "1:587066139643:web:5e22597061cd5b2804a15e",
        measurementId: "G-CG428LP7CE"
      };
      localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(state.firebaseConfig));
    }

    const savedSecurity = JSON.parse(localStorage.getItem(STORAGE_KEYS.SECURITY_SETTINGS) || 'null');
    if (savedSecurity) {
      state.securitySettings = savedSecurity;
    } else {
      state.securitySettings = {
        userId: 'Akil',
        password: '',
        isProtectionEnabled: false
      };
    }
  }

  function saveSegregationsToStorage() {
    localStorage.setItem(STORAGE_KEYS.SEGREGATIONS, JSON.stringify(state.segregations));
    syncToFirebase();
  }

  function saveTransactionsToStorage() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    syncToFirebase();
  }

  function saveSavingsVaultToStorage() {
    localStorage.setItem(STORAGE_KEYS.SAVINGS_VAULT, JSON.stringify(state.savingsVault));
    syncToFirebase();
  }

  function saveNotesToStorage() {
    localStorage.setItem(STORAGE_KEYS.PERSONAL_NOTES, JSON.stringify(state.personalNotes));
    syncToFirebase();
  }

  function setupEventListeners() {
    // Top Right Plus Button
    DOM.btnTopPlusAction.addEventListener('click', () => DOM.modalPlusAction.showModal());

    // Choice Modal Options
    DOM.btnChoiceAddExisting.addEventListener('click', () => {
      DOM.modalPlusAction.close();
      openTransactionModal('INCOME');
    });

    DOM.btnChoiceAddNewSegregation.addEventListener('click', () => {
      DOM.modalPlusAction.close();
      openSegregationModal();
    });

    // Sidebar Nav Links
    DOM.navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    // Close Modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modalEl = document.getElementById(modalId);
        if (modalEl) modalEl.close();
      });
    });

    // Submit Handlers
    DOM.transactionForm.addEventListener('submit', handleTransactionSubmit);
    DOM.segregationForm.addEventListener('submit', handleSegregationSubmit);

    DOM.txTypeSelect.addEventListener('change', () => {
      updateTransactionModalTitleAndCategory(DOM.txTypeSelect.value, state.activeModalSegregationId);
    });

    // Detail Modal Actions
    DOM.btnQuickAddBucketExpense.addEventListener('click', () => {
      const segId = state.activeDetailSegregationId;
      DOM.modalSegregationDetail.close();
      openTransactionModal('EXPENSE', segId);
    });

    DOM.btnTopUpBucketFund.addEventListener('click', () => {
      const segId = state.activeDetailSegregationId;
      DOM.modalSegregationDetail.close();
      openTransactionModal('INCOME', segId);
    });

    DOM.btnEditSegregationSettings.addEventListener('click', () => {
      const segId = state.activeDetailSegregationId;
      DOM.modalSegregationDetail.close();
      openSegregationModal(segId);
    });

    DOM.btnDeleteSegregation.addEventListener('click', () => {
      const segId = state.activeDetailSegregationId;
      deleteSegregation(segId);
    });

    // Filters
    DOM.filterMonth.addEventListener('change', renderBankStatementLedger);
    DOM.filterSegregation.addEventListener('change', renderBankStatementLedger);
    DOM.filterType.addEventListener('change', renderBankStatementLedger);
    DOM.btnClearFilters.addEventListener('click', () => {
      DOM.filterMonth.value = '';
      DOM.filterSegregation.value = 'ALL';
      DOM.filterType.value = 'ALL';
      renderBankStatementLedger();
    });

    // Save Personal Note
    DOM.btnSavePersonalNote.addEventListener('click', handleSavePersonalNote);

    // PDF Download Button
    DOM.btnDownloadPDF.addEventListener('click', handleDownloadPDF);

    // Auth Event Listeners
    if (DOM.btnTabSignIn) DOM.btnTabSignIn.addEventListener('click', () => switchAuthTab('SIGN_IN'));
    if (DOM.btnTabSignUp) DOM.btnTabSignUp.addEventListener('click', () => switchAuthTab('SIGN_UP'));
    if (DOM.authForm) DOM.authForm.addEventListener('submit', handleAuthSubmit);
    if (DOM.btnGoogleSignIn) DOM.btnGoogleSignIn.addEventListener('click', handleGoogleSignIn);
    if (DOM.btnGuestMode) {
      DOM.btnGuestMode.addEventListener('click', () => {
        state.isGuestMode = true;
        if (DOM.authView) DOM.authView.classList.add('hidden');
        if (DOM.btnShowAuthModal) DOM.btnShowAuthModal.classList.remove('hidden');
        if (DOM.userInfoContainer) DOM.userInfoContainer.classList.add('hidden');
        showToast('Continuing in offline mode', 'info');
      });
    }
    if (DOM.btnShowAuthModal) {
      DOM.btnShowAuthModal.addEventListener('click', () => {
        if (DOM.authView) DOM.authView.classList.remove('hidden');
      });
    }
    if (DOM.btnSignOut) DOM.btnSignOut.addEventListener('click', handleSignOut);


    // Security Settings & Lock Screen Listeners
    if (DOM.settingsSecurityForm) {
      DOM.settingsSecurityForm.addEventListener('submit', handleSaveSecuritySettings);
    }
    if (DOM.btnLockAppNow) {
      DOM.btnLockAppNow.addEventListener('click', lockApp);
    }
    if (DOM.btnLockAppSidebar) {
      DOM.btnLockAppSidebar.addEventListener('click', lockApp);
    }
    if (DOM.lockScreenForm) {
      DOM.lockScreenForm.addEventListener('submit', handleUnlockAppSubmit);
    }

    // Password Visibility Eye Toggle Listeners
    document.querySelectorAll('.toggle-password-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const input = document.getElementById(targetId);
        if (input) {
          const icon = btn.querySelector('i');
          if (input.type === 'password') {
            input.type = 'text';
            if (icon) {
              icon.classList.remove('fa-eye');
              icon.classList.add('fa-eye-slash');
            }
          } else {
            input.type = 'password';
            if (icon) {
              icon.classList.remove('fa-eye-slash');
              icon.classList.add('fa-eye');
            }
          }
        }
      });
    });
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    DOM.navTabs.forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-tab') === tabName);
    });
    DOM.tabContents.forEach(c => {
      c.classList.toggle('active', c.id === `tab-${tabName}`);
    });

    // SHOW ADD ENTRY BUTTON ONLY ON DASHBOARD TAB! HIDE ON OTHER PAGES!
    if (DOM.btnTopPlusAction) {
      if (tabName === 'dashboard') {
        DOM.btnTopPlusAction.style.display = 'inline-flex';
      } else {
        DOM.btnTopPlusAction.style.display = 'none';
      }
    }

    // Update Header Title
    if (DOM.topPageTitle) {
      if (tabName === 'dashboard') DOM.topPageTitle.textContent = 'Dashboard';
      else if (tabName === 'savings') DOM.topPageTitle.textContent = 'Savings Vault';
      else if (tabName === 'ledger') DOM.topPageTitle.textContent = 'Transaction History';
      else if (tabName === 'notes') DOM.topPageTitle.textContent = 'My Notes';
      else if (tabName === 'settings') DOM.topPageTitle.textContent = 'Settings';
    }

    if (tabName === 'dashboard') renderNotebookDashboard();
    else if (tabName === 'savings') renderSavingsVaultTab();
    else if (tabName === 'ledger') renderBankStatementLedger();
    else if (tabName === 'notes') renderPersonalNotesTab();
    else if (tabName === 'settings') renderSettingsTab();
  }

  function getSegregationMetrics(segId) {
    const seg = state.segregations.find(s => s.id === segId);
    if (!seg) return { allocated: 0, spent: 0, topUps: 0, remaining: 0 };

    const segTxs = state.transactions.filter(t => t.segregationId === segId);
    const spent = segTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);
    
    // Top-ups are additional INCOME transactions after initial category allocation
    const topUps = segTxs
      .filter(t => t.type === 'INCOME' && !t.id.startsWith('tx_create_') && !t.id.startsWith('tx_init_') && t.note !== 'New Category Created' && t.note !== 'Initial Allocation')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const effectiveAllocated = Number(seg.allocatedFund) + topUps;
    const remaining = effectiveAllocated - spent;

    return { allocated: Number(seg.allocatedFund), spent, topUps, remaining };
  }

  function updateBrandTitle() {
    const rawName = state.securitySettings.userId ? state.securitySettings.userId.trim() : 'Akil';
    const name = rawName || 'Akil';
    const titleText = name.toLowerCase().endsWith('s') ? `${name}' Expense Tracker` : `${name}'s Expense Tracker`;
    if (DOM.brandTitle) DOM.brandTitle.textContent = titleText;
    document.title = titleText;
  }

  function renderAll() {
    updateBrandTitle();
    renderNotebookDashboard();
    renderSavingsVaultTab();
    renderBankStatementLedger();
    renderPersonalNotesTab();
    renderSettingsTab();
    populateSegregationDropdowns();
  }

  // RENDER DASHBOARD EXECUTIVE LEDGER (EXACT NOTEBOOK FORMAT: Name ......... Amount)
  function renderNotebookDashboard() {
    if (!DOM.notebookSegregationsList || !DOM.notebookGrandTotal) return;

    DOM.notebookSegregationsList.innerHTML = '';

    // EXCLUDE SAVINGS CATEGORY FROM DASHBOARD
    const dashboardSegs = state.segregations.filter(seg => !seg.name.toLowerCase().includes('savings'));

    if (dashboardSegs.length === 0) {
      DOM.notebookSegregationsList.innerHTML = `
        <div class="text-center" style="padding: 2rem; color: var(--text-muted);">
          <p>No categories added yet. Click <strong>+ Add Entry</strong> in the top right corner!</p>
        </div>
      `;
      DOM.notebookGrandTotal.textContent = formatMoney(0);
      return;
    }

    let grandTotal = 0;

    dashboardSegs.forEach(seg => {
      const metrics = getSegregationMetrics(seg.id);
      grandTotal += metrics.remaining;

      const item = document.createElement('div');
      item.className = 'ledger-item';
      item.innerHTML = `
        <span class="ledger-item-left">${escapeHTML(seg.name)}</span>
        <span class="ledger-item-dots"></span>
        <span class="ledger-item-amount">${formatMoney(metrics.remaining)}</span>
      `;

      item.addEventListener('click', () => {
        openSegregationDetailModal(seg.id);
      });

      DOM.notebookSegregationsList.appendChild(item);
    });

    DOM.notebookGrandTotal.textContent = formatMoney(grandTotal);
  }

  // RENDER SAVINGS VAULT (READ-ONLY BANK PASSBOOK VIEW)
  function renderSavingsVaultTab() {
    let totalVaultBalance = 0;
    DOM.savingsPassbookBody.innerHTML = '';

    if (state.savingsVault.length === 0) {
      DOM.savingsPassbookBody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center text-muted" style="padding: 1.5rem;">No savings deposits recorded.</td>
        </tr>
      `;
      DOM.savingsVaultTotalDisplay.textContent = formatMoney(0);
      return;
    }

    state.savingsVault.forEach(entry => {
      totalVaultBalance += Number(entry.amount);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${entry.date}</td>
        <td><strong>${escapeHTML(entry.particulars)}</strong></td>
        <td class="passbook-credit">+${formatMoney(entry.amount)}</td>
        <td class="passbook-balance">${formatMoney(totalVaultBalance)}</td>
      `;
      DOM.savingsPassbookBody.appendChild(tr);
    });

    DOM.savingsVaultTotalDisplay.textContent = formatMoney(totalVaultBalance);
  }

  // RENDER TRANSACTION HISTORY (DEBIT & CREDIT STATEMENT - NEWEST / RECENT ON TOP)
  function renderBankStatementLedger() {
    const selectedMonth = DOM.filterMonth.value;
    const filterSeg = DOM.filterSegregation.value;
    const filterType = DOM.filterType.value;

    // Attach original array index to track exact creation order
    const indexedTx = state.transactions.map((t, idx) => ({ ...t, _origIdx: idx }));

    // Calculate running balance in chronological order (oldest to newest)
    let chronological = [...indexedTx].sort((a, b) => new Date(a.date) - new Date(b.date) || a._origIdx - b._origIdx);
    let currentBalance = 0;
    const balanceMap = new Map();
    chronological.forEach(t => {
      if (t.type === 'EXPENSE') currentBalance -= Number(t.amount);
      else currentBalance += Number(t.amount);
      balanceMap.set(t.id, currentBalance);
    });

    // Apply Filters
    let filtered = [...indexedTx];
    if (selectedMonth) {
      filtered = filtered.filter(t => t.date.startsWith(selectedMonth));
    }
    if (filterSeg !== 'ALL') {
      filtered = filtered.filter(t => t.segregationId === filterSeg);
    }
    if (filterType !== 'ALL') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // SORT MOST RECENT / NEWEST TRANSACTIONS ON TOP (FIRST PLACE)!
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date) || b._origIdx - a._origIdx);

    DOM.bankStatementBody.innerHTML = '';

    if (filtered.length === 0) {
      DOM.bankStatementBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted" style="padding: 2rem;">No entries found.</td>
        </tr>
      `;
      return;
    }

    filtered.forEach(t => {
      const isExpense = t.type === 'EXPENSE';
      const rowBalance = balanceMap.get(t.id) || 0;

      let segName = 'General';
      const seg = state.segregations.find(s => s.id === t.segregationId);
      if (seg) segName = seg.name;

      const particulars = `${segName}${t.note ? ' - ' + t.note : ''}`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${t.date}</td>
        <td><strong>${escapeHTML(particulars)}</strong></td>
        <td class="passbook-debit">${isExpense ? '-' + formatMoney(t.amount) : '—'}</td>
        <td class="passbook-credit">${!isExpense ? '+' + formatMoney(t.amount) : '—'}</td>
        <td class="passbook-balance">${formatMoney(rowBalance)}</td>
      `;

      DOM.bankStatementBody.appendChild(tr);
    });
  }

  // RENDER MY NOTES TAB (TITLE, MONEY, & MARK AS COMPLETED)
  function renderPersonalNotesTab() {
    DOM.savedNotesContainer.innerHTML = '';

    if (state.personalNotes.length === 0) {
      DOM.savedNotesContainer.innerHTML = `
        <p class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 1.5rem;">
          No notes saved yet.
        </p>
      `;
      return;
    }

    state.personalNotes.forEach(note => {
      const card = document.createElement('div');
      card.className = `note-card ${note.isCompleted ? 'completed' : ''}`;
      card.innerHTML = `
        <button class="btn-delete-note" data-note-id="${note.id}" title="Delete Note">
          &times;
        </button>
        <div class="note-header-row">
          <h4 class="note-card-title">${escapeHTML(note.title)}</h4>
        </div>
        <div class="note-card-amount">${formatMoney(note.amount)}</div>
        ${note.isCompleted ? `
          <div class="note-completed-actions">
            <span class="badge-completed"><i class="fa-solid fa-check"></i> Completed</span>
            <button class="btn-restore-note" data-note-id="${note.id}" title="Restore note to active list">
              <i class="fa-solid fa-rotate-left"></i> Restore
            </button>
          </div>
        ` : `
          <button class="btn-complete-note" data-note-id="${note.id}">
            <i class="fa-solid fa-check"></i> Mark as Completed
          </button>
        `}
        <span class="note-card-date">${note.date}</span>
      `;

      card.querySelector('.btn-delete-note').addEventListener('click', () => {
        deletePersonalNote(note.id);
      });

      if (note.isCompleted) {
        const restoreBtn = card.querySelector('.btn-restore-note');
        if (restoreBtn) {
          restoreBtn.addEventListener('click', () => {
            toggleCompleteNote(note.id);
          });
        }
      } else {
        const completeBtn = card.querySelector('.btn-complete-note');
        if (completeBtn) {
          completeBtn.addEventListener('click', () => {
            toggleCompleteNote(note.id);
          });
        }
      }

      DOM.savedNotesContainer.appendChild(card);
    });
  }

  function handleSavePersonalNote() {
    const title = DOM.personalNoteTitleInput.value.trim();
    const amount = parseFloat(DOM.personalNoteAmountInput.value) || 0;

    if (!title) {
      showToast('Please enter note title', 'danger');
      return;
    }

    const noteObj = {
      id: 'note_' + Date.now(),
      title,
      amount,
      isCompleted: false,
      date: new Date().toISOString().split('T')[0]
    };

    state.personalNotes.unshift(noteObj);
    saveNotesToStorage();
    DOM.personalNoteTitleInput.value = '';
    DOM.personalNoteAmountInput.value = '';
    renderPersonalNotesTab();
    showToast('Note saved!', 'success');
  }

  function toggleCompleteNote(noteId) {
    const note = state.personalNotes.find(n => n.id === noteId);
    if (!note) return;
    note.isCompleted = !note.isCompleted;
    saveNotesToStorage();
    renderPersonalNotesTab();
    showToast(note.isCompleted ? 'Note marked as completed!' : 'Note restored to active list!', 'success');
  }

  function deletePersonalNote(noteId) {
    if (!confirm('Delete this note?')) return;
    state.personalNotes = state.personalNotes.filter(n => n.id !== noteId);
    saveNotesToStorage();
    renderPersonalNotesTab();
    showToast('Note deleted', 'success');
  }

  // DOWNLOAD PDF FUNCTION (NORMAL PDF FORM PRINT)
  function handleDownloadPDF() {
    window.print();
  }

  // OPEN SPECIFIC CATEGORY DETAIL MODAL (SHOWS HOW MUCH I HAVE, SPEND, & HISTORY FOR THAT CATEGORY ONLY)
  function openSegregationDetailModal(segId) {
    const seg = state.segregations.find(s => s.id === segId);
    if (!seg) return;

    state.activeDetailSegregationId = segId;
    const metrics = getSegregationMetrics(segId);

    DOM.detailSegregationTitle.textContent = `${seg.name} Details`;
    DOM.detailAllocatedFund.textContent = formatMoney(metrics.allocated + metrics.topUps);
    DOM.detailTotalSpent.textContent = formatMoney(metrics.spent);
    DOM.detailRemainingFund.textContent = formatMoney(metrics.remaining);

    // History for this Specific Category ONLY (Newest on Top)
    const segTxs = state.transactions
      .map((t, idx) => ({ ...t, _origIdx: idx }))
      .filter(t => t.segregationId === segId)
      .sort((a, b) => new Date(b.date) - new Date(a.date) || b._origIdx - a._origIdx);

    DOM.detailTransactionsTableBody.innerHTML = '';

    if (segTxs.length === 0) {
      DOM.detailTransactionsTableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted" style="padding: 1.5rem;">
            No transactions logged for ${escapeHTML(seg.name)} yet.
          </td>
        </tr>
      `;
    } else {
      segTxs.forEach(t => {
        const tr = document.createElement('tr');
        const isExpense = t.type === 'EXPENSE';
        const typeBadge = isExpense ? '<span class="badge badge-debit">Debit</span>' : '<span class="badge badge-credit">Credit</span>';
        const amountClass = isExpense ? 'passbook-debit' : 'passbook-credit';
        const prefix = isExpense ? '-' : '+';

        tr.innerHTML = `
          <td>${t.date}</td>
          <td>${typeBadge}</td>
          <td>${escapeHTML(t.note || '-')}</td>
          <td class="${amountClass}">${prefix}${formatMoney(t.amount)}</td>
          <td>
            <button class="btn btn-outline-danger btn-sm btn-delete-tx" data-tx-id="${t.id}">
              Delete
            </button>
          </td>
        `;

        tr.querySelector('.btn-delete-tx').addEventListener('click', () => {
          deleteTransaction(t.id);
          openSegregationDetailModal(segId);
        });

        DOM.detailTransactionsTableBody.appendChild(tr);
      });
    }

    DOM.modalSegregationDetail.showModal();
  }

  function populateSegregationDropdowns() {
    const options = state.segregations.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
    DOM.txSegregationSelect.innerHTML = options;
    DOM.filterSegregation.innerHTML = '<option value="ALL">All Categories</option>' + options;
  }

  function updateTransactionModalTitleAndCategory(type, preselectedSegId) {
    if (preselectedSegId) {
      const seg = state.segregations.find(s => s.id === preselectedSegId);
      if (seg) {
        // Set Header Title: "Debit (Spend Money on Interest)" or "Credit (Add Money to Interest)"
        if (type === 'EXPENSE') {
          DOM.transactionModalTitle.textContent = `Debit (Spend Money on ${seg.name})`;
        } else {
          DOM.transactionModalTitle.textContent = `Credit (Add Money to ${seg.name})`;
        }

        // Set value on hidden select and show clean read-only text input
        DOM.txSegregationSelect.innerHTML = `<option value="${seg.id}">${escapeHTML(seg.name)}</option>`;
        DOM.txSegregationSelect.value = seg.id;
        DOM.txSegregationSelect.classList.add('hidden');

        if (DOM.txSegregationReadOnly) {
          DOM.txSegregationReadOnly.value = seg.name;
          DOM.txSegregationReadOnly.classList.remove('hidden');
        }
        return;
      }
    }

    // Default when no specific category is pre-selected (from top + Add Entry button)
    populateSegregationDropdowns();
    DOM.txSegregationSelect.classList.remove('hidden');
    if (DOM.txSegregationReadOnly) {
      DOM.txSegregationReadOnly.classList.add('hidden');
    }
    DOM.transactionModalTitle.textContent = type === 'EXPENSE' ? 'Debit (Spend Money)' : 'Credit (Add Money)';
  }

  function openTransactionModal(type = 'EXPENSE', preselectedSegId = null) {
    DOM.txIdInput.value = '';
    DOM.txTypeSelect.value = type;
    state.activeModalSegregationId = preselectedSegId;

    updateTransactionModalTitleAndCategory(type, preselectedSegId);

    DOM.txAmountInput.value = '';
    DOM.txDateInput.value = new Date().toISOString().split('T')[0];
    DOM.txNoteInput.value = '';
    DOM.modalTransaction.showModal();
  }

  function openSegregationModal(segId = null) {
    if (segId) {
      const seg = state.segregations.find(s => s.id === segId);
      if (!seg) return;
      DOM.segIdInput.value = seg.id;
      DOM.segNameInput.value = seg.name;
      DOM.segAllocatedInput.value = seg.allocatedFund;
      DOM.segregationModalTitle.textContent = 'Edit Category';
    } else {
      DOM.segIdInput.value = '';
      DOM.segNameInput.value = '';
      DOM.segAllocatedInput.value = '';
      DOM.segregationModalTitle.textContent = 'Add Category';
    }
    DOM.modalSegregation.showModal();
  }

  function showAlertModal(title = 'Insufficient Balance!', message = 'Insufficient Balance!') {
    if (DOM.modalAlertTitle) DOM.modalAlertTitle.textContent = title;
    if (DOM.modalAlertMessage) DOM.modalAlertMessage.textContent = message;
    if (DOM.modalAlert) DOM.modalAlert.showModal();
  }

  function handleTransactionSubmit(e) {
    e.preventDefault();
    const type = DOM.txTypeSelect.value;
    const segId = DOM.txSegregationSelect.value;
    const amount = parseFloat(DOM.txAmountInput.value);
    const date = DOM.txDateInput.value;
    const note = DOM.txNoteInput.value.trim();

    if (!amount || amount <= 0 || !date || !segId) {
      showToast('Please enter valid details', 'danger');
      return;
    }

    // COMPULSORY DESCRIPTION CHECK
    if (!note) {
      showToast('Description is required!', 'danger');
      if (DOM.txNoteInput) DOM.txNoteInput.focus();
      return;
    }

    // PREVENT EXPENSE FROM EXCEEDING REMAINING BALANCE (FLOOR IS 0)
    if (type === 'EXPENSE') {
      const metrics = getSegregationMetrics(segId);

      if (amount > metrics.remaining) {
        showAlertModal('Insufficient Balance!', 'Insufficient Balance!');
        showToast('Insufficient Balance!', 'danger');
        return;
      }
    }

    const txObj = {
      id: 'tx_' + Date.now(),
      segregationId: segId,
      type,
      amount,
      date,
      monthKey: getCurrentMonthKey(new Date(date)),
      note
    };

    state.transactions.push(txObj);

    // AUTO-SYNC SAVINGS
    const targetSeg = state.segregations.find(s => s.id === segId);
    if (targetSeg && targetSeg.name.toLowerCase().includes('savings')) {
      if (type === 'INCOME') {
        state.savingsVault.push({
          id: 'sav_' + Date.now(),
          date,
          particulars: `Top-Up to Savings (${note})`,
          amount
        });
        saveSavingsVaultToStorage();
      }
    }

    saveTransactionsToStorage();
    DOM.modalTransaction.close();
    renderAll();
    showToast('Entry saved!', 'success');
  }

  function handleSegregationSubmit(e) {
    e.preventDefault();
    const id = DOM.segIdInput.value;
    const name = DOM.segNameInput.value.trim();
    const allocatedFund = parseFloat(DOM.segAllocatedInput.value) || 0;

    if (!name) {
      showToast('Please enter a name', 'danger');
      return;
    }

    if (id) {
      const seg = state.segregations.find(s => s.id === id);
      if (seg) {
        seg.name = name;
        seg.allocatedFund = allocatedFund;
      }
    } else {
      const newSegId = 'seg_' + Date.now();
      const todayStr = new Date().toISOString().split('T')[0];
      const newSeg = {
        id: newSegId,
        name,
        allocatedFund
      };
      state.segregations.push(newSeg);

      // Record transaction in Transaction History for new category creation
      state.transactions.push({
        id: 'tx_create_' + Date.now(),
        segregationId: newSegId,
        type: 'INCOME',
        amount: allocatedFund,
        date: todayStr,
        monthKey: getCurrentMonthKey(new Date(todayStr)),
        note: 'New Category Created'
      });
      saveTransactionsToStorage();

      if (name.toLowerCase().includes('savings') && allocatedFund > 0) {
        state.savingsVault.push({
          id: 'sav_' + Date.now(),
          date: todayStr,
          particulars: `${name} Initial Allocation`,
          amount: allocatedFund
        });
        saveSavingsVaultToStorage();
      }
    }

    saveSegregationsToStorage();
    DOM.modalSegregation.close();
    renderAll();
    showToast('Category created & reflected in Transaction History!', 'success');
  }

  function deleteTransaction(txId) {
    if (!confirm('Delete this entry?')) return;
    state.transactions = state.transactions.filter(t => t.id !== txId);
    saveTransactionsToStorage();
    renderAll();
    showToast('Entry deleted', 'success');
  }

  function deleteSegregation(segId) {
    if (!confirm('Delete this category and all its history?')) return;
    state.segregations = state.segregations.filter(s => s.id !== segId);
    state.transactions = state.transactions.filter(t => t.segregationId !== segId);
    saveSegregationsToStorage();
    saveTransactionsToStorage();
    DOM.modalSegregationDetail.close();
    renderAll();
    showToast('Category deleted', 'success');
  }

  function switchAuthTab(mode) {
    state.authMode = mode;
    if (mode === 'SIGN_IN') {
      if (DOM.btnTabSignIn) DOM.btnTabSignIn.classList.add('active');
      if (DOM.btnTabSignUp) DOM.btnTabSignUp.classList.remove('active');
      if (DOM.btnAuthSubmit) DOM.btnAuthSubmit.textContent = 'Sign In';
    } else {
      if (DOM.btnTabSignUp) DOM.btnTabSignUp.classList.add('active');
      if (DOM.btnTabSignIn) DOM.btnTabSignIn.classList.remove('active');
      if (DOM.btnAuthSubmit) DOM.btnAuthSubmit.textContent = 'Create Account';
    }
    hideAuthError();
  }

  function hideAuthError() {
    if (DOM.authErrorMessage) {
      DOM.authErrorMessage.textContent = '';
      DOM.authErrorMessage.classList.add('hidden');
    }
  }

  function showAuthError(message) {
    if (DOM.authErrorMessage) {
      DOM.authErrorMessage.textContent = message;
      DOM.authErrorMessage.classList.remove('hidden');
    }
  }

  function handleAuthSubmit(e) {
    e.preventDefault();
    hideAuthError();

    const email = DOM.authEmailInput.value.trim();
    const password = DOM.authPasswordInput.value;

    if (!email || !password) {
      showAuthError('Please enter email and password.');
      return;
    }

    if (!state.auth && state.firebaseConfig) {
      initFirebaseIfAvailable();
    }

    if (!state.auth) {
      showAuthError('Firebase Auth is not configured. Click "Cloud Sync" in the sidebar to paste your config.');
      return;
    }

    const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = window.FirebaseSDK;

    if (DOM.btnAuthSubmit) {
      DOM.btnAuthSubmit.disabled = true;
      DOM.btnAuthSubmit.textContent = 'Authenticating...';
    }

    // Try sign in first, or auto-create account on first login
    signInWithEmailAndPassword(state.auth, email, password)
      .then((userCred) => {
        if (DOM.authEmailInput) DOM.authEmailInput.value = '';
        if (DOM.authPasswordInput) DOM.authPasswordInput.value = '';
        showToast('Welcome back, Akil!', 'success');
      })
      .catch((err) => {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          createUserWithEmailAndPassword(state.auth, email, password)
            .then(() => {
              if (DOM.authEmailInput) DOM.authEmailInput.value = '';
              if (DOM.authPasswordInput) DOM.authPasswordInput.value = '';
              showToast('Welcome, Akil! Account registered & signed in.', 'success');
            })
            .catch((signUpErr) => {
              console.error('Sign In/Up Error:', signUpErr);
              showAuthError(getFriendlyAuthErrorMessage(signUpErr.code));
            });
        } else {
          console.error('Sign In Error:', err);
          showAuthError(getFriendlyAuthErrorMessage(err.code));
        }
      })
      .finally(() => {
        if (DOM.btnAuthSubmit) {
          DOM.btnAuthSubmit.disabled = false;
          DOM.btnAuthSubmit.textContent = 'Sign In';
        }
      });
  }

  function handleGoogleSignIn() {
    hideAuthError();

    if (!state.auth && state.firebaseConfig) {
      initFirebaseIfAvailable();
    }

    if (!state.auth) {
      showAuthError('Firebase Auth is not configured. Click "Cloud Sync" in the sidebar to paste your config.');
      return;
    }

    const { signInWithPopup, GoogleAuthProvider } = window.FirebaseSDK;
    const provider = new GoogleAuthProvider();

    signInWithPopup(state.auth, provider)
      .then((result) => {
        showToast(`Welcome back, ${result.user.displayName || result.user.email}!`, 'success');
      })
      .catch((err) => {
        console.error('Google Sign In Error:', err);
        if (err.code !== 'auth/popup-closed-by-user') {
          showAuthError(getFriendlyAuthErrorMessage(err.code));
        }
      });
  }

  function handleSignOut() {
    state.isGuestMode = false;
    if (!state.auth) {
      if (DOM.authView) DOM.authView.classList.remove('hidden');
      if (DOM.userInfoContainer) DOM.userInfoContainer.classList.add('hidden');
      if (DOM.btnShowAuthModal) DOM.btnShowAuthModal.classList.add('hidden');
      showToast('Signed out', 'info');
      return;
    }

    const { signOut } = window.FirebaseSDK;
    signOut(state.auth)
      .then(() => {
        state.currentUser = null;
        state.userId = null;
        if (DOM.authView) DOM.authView.classList.remove('hidden');
        if (DOM.userInfoContainer) DOM.userInfoContainer.classList.add('hidden');
        if (DOM.btnShowAuthModal) DOM.btnShowAuthModal.classList.add('hidden');
        showToast('Signed out successfully!', 'success');
      })
      .catch(err => console.error('Sign Out Error:', err));
  }

  function getFriendlyAuthErrorMessage(code) {
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists. Try signing in.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed.';
      default:
        return 'Authentication failed. Please check your credentials.';
    }
  }

  function initFirebaseIfAvailable() {
    if (!state.firebaseConfig || !window.FirebaseSDK) {
      state.isFirebaseOnline = false;
      if (DOM.cloudSyncBadge) DOM.cloudSyncBadge.className = 'status-dot offline';
      return;
    }

    try {
      const { initializeApp, getFirestore, doc, onSnapshot } = window.FirebaseSDK;
      const app = initializeApp(state.firebaseConfig);
      state.db = getFirestore(app);
      state.isFirebaseOnline = true;
      if (DOM.cloudSyncBadge) DOM.cloudSyncBadge.className = 'status-dot online';

      // Perform immediate sync to push current state to Cloud Firestore
      syncToFirebase();

      // Realtime Sync User Document for Akil
      const syncDocId = state.securitySettings.userId || 'akil_main_ledger';
      const userDocRef = doc(state.db, 'users', syncDocId);
      onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData.segregations) state.segregations = cloudData.segregations;
          if (cloudData.transactions) state.transactions = cloudData.transactions;
          if (cloudData.savingsVault) state.savingsVault = cloudData.savingsVault;
          if (cloudData.personalNotes) state.personalNotes = cloudData.personalNotes;
          renderAll();
        }
      }, (err) => {
        console.warn('Cloud Sync listener warning:', err);
      });
    } catch (err) {
      console.error('Firebase Initialization Error:', err);
      state.isFirebaseOnline = false;
      if (DOM.cloudSyncBadge) DOM.cloudSyncBadge.className = 'status-dot offline';
    }
  }

  window.addEventListener('firebase-sdk-ready', () => {
    initFirebaseIfAvailable();
  });



  function syncToFirebase() {
    if (!state.isFirebaseOnline || !state.db) return;
    try {
      const { doc, setDoc } = window.FirebaseSDK;
      const syncDocId = state.securitySettings.userId || 'akil_main_ledger';
      const userDocRef = doc(state.db, 'users', syncDocId);
      setDoc(userDocRef, {
        segregations: state.segregations,
        transactions: state.transactions,
        savingsVault: state.savingsVault,
        personalNotes: state.personalNotes,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error('Firebase Sync Error:', err);
    }
  }

  function checkAppLockStatus() {
    state.isAppUnlocked = true;
    if (DOM.lockScreenView) DOM.lockScreenView.classList.add('hidden');
  }

  function renderSettingsTab() {
    if (DOM.settingsUserIdInput) {
      DOM.settingsUserIdInput.value = state.securitySettings.userId || 'Akil';
    }
  }

  function handleSaveSecuritySettings(e) {
    e.preventDefault();
    const userId = DOM.settingsUserIdInput ? DOM.settingsUserIdInput.value.trim() || 'Akil' : 'Akil';
    state.securitySettings.userId = userId;
    localStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(state.securitySettings));
    renderAll();
    syncToFirebase();
    showToast('Profile name updated & saved successfully!', 'success');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
      <span>${escapeHTML(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
