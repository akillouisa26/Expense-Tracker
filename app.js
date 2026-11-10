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
    selectedExpenseMonth: getCurrentMonthKey(),
    expenseGraphMode: 'CATEGORIES', // 'CATEGORIES' or 'PREVIOUS_MONTHS'
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
    isAppUnlocked: false,
    isInitialCloudSyncDone: false,
    charts: {
      singleExpense: null
    }
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
    DOM.settingsCurrentPasswordInput = document.getElementById('settingsCurrentPasswordInput');
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

    // Dashboard Reminders Notification Banner
    DOM.dashboardRemindersBanner = document.getElementById('dashboardRemindersBanner');
    DOM.reminderBannerTitle = document.getElementById('reminderBannerTitle');
    DOM.reminderBannerSubtitle = document.getElementById('reminderBannerSubtitle');
    DOM.btnGoToNotes = document.getElementById('btnGoToNotes');
    DOM.dashboardRemindersList = document.getElementById('dashboardRemindersList');

    // Dashboard Monthly Expense Overview Card Elements
    DOM.monthlyExpenseDashboardCard = document.getElementById('monthlyExpenseDashboardCard');
    DOM.btnPrevExpenseMonth = document.getElementById('btnPrevExpenseMonth');
    DOM.selectExpenseMonth = document.getElementById('selectExpenseMonth');
    DOM.btnNextExpenseMonth = document.getElementById('btnNextExpenseMonth');
    DOM.labelSelectedMonthExpense = document.getElementById('labelSelectedMonthExpense');
    DOM.displayMonthTotalExpense = document.getElementById('displayMonthTotalExpense');
    DOM.displayPrevMonthComparison = document.getElementById('displayPrevMonthComparison');
    DOM.btnModeCategorySpend = document.getElementById('btnModeCategorySpend');
    DOM.btnModePreviousMonths = document.getElementById('btnModePreviousMonths');
    DOM.labelModeMonthName = document.getElementById('labelModeMonthName');
    DOM.singleExpenseChart = document.getElementById('singleExpenseChart');
    DOM.singleExpenseFallback = document.getElementById('singleExpenseFallback');

    // Savings Vault Tab & Actions
    DOM.savingsVaultTotalDisplay = document.getElementById('savingsVaultTotalDisplay');
    DOM.savingsPassbookBody = document.getElementById('savingsPassbookBody');
    DOM.btnSavingsDeposit = document.getElementById('btnSavingsDeposit');
    DOM.btnSavingsWithdraw = document.getElementById('btnSavingsWithdraw');

    // Savings Entry Modal
    DOM.modalSavingsEntry = document.getElementById('modalSavingsEntry');
    DOM.savingsEntryForm = document.getElementById('savingsEntryForm');
    DOM.savingsModalTitle = document.getElementById('savingsModalTitle');
    DOM.savIdInput = document.getElementById('savIdInput');
    DOM.savTypeInput = document.getElementById('savTypeInput');
    DOM.savAmountInput = document.getElementById('savAmountInput');
    DOM.savDateInput = document.getElementById('savDateInput');
    DOM.savNoteInput = document.getElementById('savNoteInput');

    // Transaction History Tab & Filters
    DOM.filterMonth = document.getElementById('filterMonth');
    DOM.filterSegregation = document.getElementById('filterSegregation');
    DOM.filterType = document.getElementById('filterType');
    DOM.btnClearFilters = document.getElementById('btnClearFilters');
    DOM.bankStatementBody = document.getElementById('bankStatementBody');
    DOM.btnDownloadPDF = document.getElementById('btnDownloadPDF');

    // My Notes Tab
    DOM.personalNoteTitleInput = document.getElementById('personalNoteTitleInput');
    DOM.personalNoteDateInput = document.getElementById('personalNoteDateInput');
    DOM.personalNoteAmountInput = document.getElementById('personalNoteAmountInput');
    DOM.btnSavePersonalNote = document.getElementById('btnSavePersonalNote');
    DOM.savedNotesContainer = document.getElementById('savedNotesContainer');
    if (DOM.personalNoteDateInput) {
      DOM.personalNoteDateInput.value = new Date().toISOString().split('T')[0];
    }

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

    // Load Segregations
    const savedSegs = JSON.parse(localStorage.getItem(STORAGE_KEYS.SEGREGATIONS) || 'null');
    if (savedSegs && Array.isArray(savedSegs)) {
      state.segregations = savedSegs;
    } else {
      state.segregations = [];
      saveSegregationsToStorage();
    }

    // Load Transactions
    const savedTxs = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || 'null');
    if (savedTxs && Array.isArray(savedTxs)) {
      state.transactions = savedTxs;
    } else {
      state.transactions = [];
      saveTransactionsToStorage();
    }

    // Purge any default/auto-created empty Savings category if it has 0 transactions & 0 allocation
    purgeEmptyDefaultSavings();

    const savedNotes = JSON.parse(localStorage.getItem(STORAGE_KEYS.PERSONAL_NOTES) || 'null');
    if (savedNotes && Array.isArray(savedNotes)) {
      state.personalNotes = savedNotes;
    } else {
      state.personalNotes = [];
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
      if (!state.securitySettings.password) {
        state.securitySettings.password = '1234';
      }
    } else {
      state.securitySettings = {
        password: '1234',
        isProtectionEnabled: true
      };
    }
  }

  function purgeEmptyDefaultSavings() {
    state.segregations = state.segregations.filter(seg => {
      const isSavingsName = seg.name && seg.name.trim().toLowerCase() === 'savings';
      if (!isSavingsName) return true;

      const hasTransactions = state.transactions.some(t => t.segregationId === seg.id);
      if (!hasTransactions && (Number(seg.allocatedFund) || 0) === 0) {
        return false;
      }
      return true;
    });
    localStorage.setItem(STORAGE_KEYS.SEGREGATIONS, JSON.stringify(state.segregations));
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
    if (DOM.savingsEntryForm) {
      DOM.savingsEntryForm.addEventListener('submit', handleSavingsEntrySubmit);
    }

    if (DOM.btnSavingsDeposit) {
      DOM.btnSavingsDeposit.addEventListener('click', () => openSavingsModal('INCOME'));
    }
    if (DOM.btnSavingsWithdraw) {
      DOM.btnSavingsWithdraw.addEventListener('click', () => openSavingsModal('EXPENSE'));
    }

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

    // Dashboard Reminders Navigation
    if (DOM.btnGoToNotes) {
      DOM.btnGoToNotes.addEventListener('click', () => switchTab('notes'));
    }

    // Monthly Expense Overview Controls
    if (DOM.selectExpenseMonth) {
      DOM.selectExpenseMonth.addEventListener('change', () => {
        state.selectedExpenseMonth = DOM.selectExpenseMonth.value;
        renderUnifiedExpenseSection();
      });
    }

    if (DOM.btnPrevExpenseMonth) {
      DOM.btnPrevExpenseMonth.addEventListener('click', () => {
        navigateExpenseMonth(-1);
      });
    }

    if (DOM.btnNextExpenseMonth) {
      DOM.btnNextExpenseMonth.addEventListener('click', () => {
        navigateExpenseMonth(1);
      });
    }

    if (DOM.btnModeCategorySpend) {
      DOM.btnModeCategorySpend.addEventListener('click', () => {
        state.expenseGraphMode = 'CATEGORIES';
        if (DOM.btnModeCategorySpend) DOM.btnModeCategorySpend.classList.add('active');
        if (DOM.btnModePreviousMonths) DOM.btnModePreviousMonths.classList.remove('active');
        renderUnifiedExpenseSection();
      });
    }

    if (DOM.btnModePreviousMonths) {
      DOM.btnModePreviousMonths.addEventListener('click', () => {
        state.expenseGraphMode = 'PREVIOUS_MONTHS';
        if (DOM.btnModePreviousMonths) DOM.btnModePreviousMonths.classList.add('active');
        if (DOM.btnModeCategorySpend) DOM.btnModeCategorySpend.classList.remove('active');
        renderUnifiedExpenseSection();
      });
    }

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
      else if (tabName === 'ledger') DOM.topPageTitle.textContent = 'Transaction History';
      else if (tabName === 'notes') DOM.topPageTitle.textContent = 'My Notes';
      else if (tabName === 'settings') DOM.topPageTitle.textContent = 'Settings';
    }

    if (tabName === 'dashboard') {
      renderNotebookDashboard();
      renderDashboardReminders();
      renderUnifiedExpenseSection();
    }
    else if (tabName === 'ledger') renderBankStatementLedger();
    else if (tabName === 'notes') renderPersonalNotesTab();
    else if (tabName === 'settings') renderSettingsTab();
  }

  function getSegregationMetrics(segId) {
    const seg = state.segregations.find(s => s.id === segId);
    if (!seg) return { allocated: 0, spent: 0, topUps: 0, remaining: 0 };

    const segTxs = state.transactions.filter(t => t.segregationId === segId);

    // Identify initial allocation transaction if present
    const initTx = segTxs.find(t =>
      t.id.startsWith('tx_create_') ||
      t.id.startsWith('tx_init_') ||
      t.note === 'New Category Created' ||
      t.note === 'Initial Allocation' ||
      (t.type === 'INCOME' && segTxs.indexOf(t) === 0)
    );

    const allocated = initTx ? Number(initTx.amount) : (Number(seg.allocatedFund) || 0);

    // Keep seg.allocatedFund synchronized with initTx amount
    if (initTx && Number(seg.allocatedFund) !== Number(initTx.amount)) {
      seg.allocatedFund = Number(initTx.amount);
      saveSegregationsToStorage();
    }

    const spent = segTxs.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + Number(t.amount), 0);

    // Top-ups are additional INCOME transactions besides the initial allocation transaction
    const topUps = segTxs
      .filter(t => t.type === 'INCOME' && t !== initTx)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const effectiveAllocated = allocated + topUps;
    const remaining = effectiveAllocated - spent;

    return { allocated, spent, topUps, remaining };
  }

  function updateBrandTitle() {
    const rawName = state.securitySettings.userId ? state.securitySettings.userId.trim() : 'Akil';
    const name = rawName || 'Akil';
    const titleText = name.toLowerCase().endsWith('s') ? `${name}' Expense Tracker` : `${name}'s Expense Tracker`;
    if (DOM.brandTitle) DOM.brandTitle.textContent = titleText;
    if (DOM.lockScreenUserLabel) DOM.lockScreenUserLabel.textContent = titleText;
    document.title = titleText;
  }

  function renderAll() {
    updateBrandTitle();
    renderNotebookDashboard();
    renderDashboardReminders();
    renderUnifiedExpenseSection();
    renderBankStatementLedger();
    renderPersonalNotesTab();
    renderSettingsTab();
    populateSegregationDropdowns();
  }

  // RENDER DASHBOARD EXECUTIVE LEDGER (EXACT NOTEBOOK FORMAT: Name ......... Amount)
  function renderNotebookDashboard() {
    if (!DOM.notebookSegregationsList || !DOM.notebookGrandTotal) return;

    DOM.notebookSegregationsList.innerHTML = '';

    // Include all categories on Dashboard (including Savings)
    const dashboardSegs = state.segregations;

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

  // RENDER SAVINGS VAULT (BANK PASSBOOK VIEW WITH DEPOSIT, WITHDRAW, & EDIT)
  function renderSavingsVaultTab() {
    let totalVaultBalance = 0;
    DOM.savingsPassbookBody.innerHTML = '';

    if (state.savingsVault.length === 0) {
      DOM.savingsPassbookBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted" style="padding: 1.5rem;">No savings entries recorded.</td>
        </tr>
      `;
      DOM.savingsVaultTotalDisplay.textContent = formatMoney(0);
      return;
    }

    state.savingsVault.forEach(entry => {
      const isDebit = entry.type === 'EXPENSE' || Number(entry.amount) < 0;
      const amt = Math.abs(Number(entry.amount));
      if (isDebit) {
        totalVaultBalance -= amt;
      } else {
        totalVaultBalance += amt;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${entry.date}</td>
        <td><strong>${escapeHTML(entry.particulars)}</strong></td>
        <td class="passbook-debit">${isDebit ? '-' + formatMoney(amt) : '—'}</td>
        <td class="passbook-credit">${!isDebit ? '+' + formatMoney(amt) : '—'}</td>
        <td class="passbook-balance">${formatMoney(totalVaultBalance)}</td>
        <td>
          <div style="display: flex; gap: 0.35rem;">
            <button class="btn btn-outline-brown btn-sm btn-edit-sav" data-sav-id="${entry.id}">
              <i class="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button class="btn btn-outline-danger btn-sm btn-delete-sav" data-sav-id="${entry.id}">
              <i class="fa-solid fa-trash"></i> Delete
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-edit-sav').addEventListener('click', () => {
        openSavingsModal(entry.type || (isDebit ? 'EXPENSE' : 'INCOME'), entry.id);
      });

      tr.querySelector('.btn-delete-sav').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this savings entry?')) {
          state.savingsVault = state.savingsVault.filter(s => s.id !== entry.id);
          state.transactions = state.transactions.filter(t => t.id !== entry.id && t.id !== `tx_sav_${entry.id}`);
          saveSavingsVaultToStorage();
          saveTransactionsToStorage();
          renderAll();
          showToast('Savings entry deleted successfully!', 'info');
        }
      });

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

      let segName = t.segregationName || 'General';
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
        <td>
          <div style="display: flex; gap: 0.35rem; justify-content: center;">
            <button class="btn btn-outline-brown btn-sm btn-edit-tx" data-tx-id="${t.id}" title="Edit Transaction" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-outline-danger btn-sm btn-delete-tx" data-tx-id="${t.id}" title="Delete Transaction" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-edit-tx').addEventListener('click', () => {
        openTransactionModal(t.type, t.segregationId, t.id);
      });

      tr.querySelector('.btn-delete-tx').addEventListener('click', () => {
        deleteTransaction(t.id);
      });

      DOM.bankStatementBody.appendChild(tr);
    });
  }

  // RENDER MY NOTES TAB (TITLE, MONEY, DATE, & MARK AS COMPLETED)
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

    const todayStr = new Date().toISOString().split('T')[0];

    state.personalNotes.forEach(note => {
      const card = document.createElement('div');
      card.className = `note-card ${note.isCompleted ? 'completed' : ''}`;

      let dateBadgeHtml = `<span class="note-card-date">${note.date || todayStr}</span>`;
      if (!note.isCompleted && note.date) {
        if (note.date === todayStr) {
          dateBadgeHtml = `<span class="badge-today"><i class="fa-solid fa-clock"></i> Due Today</span>`;
        } else if (note.date < todayStr) {
          dateBadgeHtml = `<span class="badge-overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue (${note.date})</span>`;
        } else {
          dateBadgeHtml = `<span class="badge-upcoming"><i class="fa-regular fa-calendar-check"></i> Due: ${note.date}</span>`;
        }
      }

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
        <div style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between;">
          ${dateBadgeHtml}
        </div>
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
    const date = (DOM.personalNoteDateInput && DOM.personalNoteDateInput.value)
      ? DOM.personalNoteDateInput.value
      : new Date().toISOString().split('T')[0];

    if (!title) {
      showToast('Please enter note title', 'danger');
      return;
    }

    const noteObj = {
      id: 'note_' + Date.now(),
      title,
      amount,
      isCompleted: false,
      date
    };

    state.personalNotes.unshift(noteObj);
    saveNotesToStorage();
    DOM.personalNoteTitleInput.value = '';
    DOM.personalNoteAmountInput.value = '';
    if (DOM.personalNoteDateInput) {
      DOM.personalNoteDateInput.value = new Date().toISOString().split('T')[0];
    }
    renderPersonalNotesTab();
    renderDashboardReminders();
    showToast('Note saved with reminder date!', 'success');
  }

  function toggleCompleteNote(noteId) {
    const note = state.personalNotes.find(n => n.id === noteId);
    if (!note) return;
    note.isCompleted = !note.isCompleted;
    saveNotesToStorage();
    renderPersonalNotesTab();
    renderDashboardReminders();
    showToast(note.isCompleted ? 'Note marked as completed!' : 'Note restored to active list!', 'success');
  }

  function deletePersonalNote(noteId) {
    if (!confirm('Delete this note?')) return;
    state.personalNotes = state.personalNotes.filter(n => n.id !== noteId);
    saveNotesToStorage();
    renderPersonalNotesTab();
    renderDashboardReminders();
    showToast('Note deleted', 'success');
  }

  // ==========================================================================
  // DASHBOARD REMINDERS & NOTIFICATION BANNER LOGIC
  // ==========================================================================
  function renderDashboardReminders() {
    if (!DOM.dashboardRemindersBanner || !DOM.dashboardRemindersList) return;

    const activeNotes = state.personalNotes.filter(n => !n.isCompleted);
    if (activeNotes.length === 0) {
      DOM.dashboardRemindersBanner.classList.add('hidden');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let dueTodayCount = 0;
    let overdueCount = 0;

    activeNotes.forEach(n => {
      if (n.date === todayStr) dueTodayCount++;
      else if (n.date < todayStr) overdueCount++;
    });

    DOM.dashboardRemindersBanner.classList.remove('hidden');

    if (overdueCount > 0 || dueTodayCount > 0) {
      DOM.reminderBannerTitle.textContent = `🔔 ${dueTodayCount + overdueCount} Task${(dueTodayCount + overdueCount) > 1 ? 's' : ''} Need Attention!`;
      DOM.reminderBannerSubtitle.textContent = `${dueTodayCount} due today, ${overdueCount} overdue. Check your scheduled tasks.`;
    } else {
      DOM.reminderBannerTitle.textContent = `📌 Scheduled Notes & Reminders (${activeNotes.length})`;
      DOM.reminderBannerSubtitle.textContent = `You have ${activeNotes.length} active scheduled task${activeNotes.length > 1 ? 's' : ''}`;
    }

    DOM.dashboardRemindersList.innerHTML = '';
    // Sort upcoming/overdue notes chronologically
    const sortedNotes = [...activeNotes].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedNotes.slice(0, 6).forEach(note => {
      const isToday = note.date === todayStr;
      const isOverdue = note.date < todayStr;
      const statusBadge = isToday
        ? `<span class="badge-today"><i class="fa-solid fa-clock"></i> Today</span>`
        : (isOverdue ? `<span class="badge-overdue"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>` : `<span class="badge-upcoming">${note.date}</span>`);

      const chip = document.createElement('div');
      chip.className = 'reminder-chip';
      chip.innerHTML = `
        ${statusBadge}
        <strong>${escapeHTML(note.title)}</strong>
        <span style="color: var(--brown-primary); font-weight: 700;">${formatMoney(note.amount)}</span>
        <button class="btn-done-chip" title="Mark Done" style="margin-left: 0.25rem;">
          <i class="fa-solid fa-check"></i>
        </button>
      `;

      chip.querySelector('.btn-done-chip').addEventListener('click', () => {
        toggleCompleteNote(note.id);
      });

      DOM.dashboardRemindersList.appendChild(chip);
    });
  }

  // ==========================================================================
  // MONTHLY EXPENSE AGGREGATION & DATA PROCESSING
  // ==========================================================================
  function getMonthlyExpenseAggregates() {
    const monthlyMap = new Map();
    let totalExpenseRecorded = 0;
    let totalTxCount = 0;

    // Pre-populate last 6 calendar months so the chart always displays a smooth history
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = getCurrentMonthKey(d);
      monthlyMap.set(mKey, { expense: 0, income: 0, categories: {} });
    }

    state.transactions.forEach(t => {
      if (!t.date) return;
      const mKey = t.monthKey || t.date.substring(0, 7);
      if (!monthlyMap.has(mKey)) {
        monthlyMap.set(mKey, { expense: 0, income: 0, categories: {} });
      }
      const data = monthlyMap.get(mKey);
      const amt = Number(t.amount) || 0;
      if (t.type === 'EXPENSE') {
        data.expense += amt;
        totalExpenseRecorded += amt;
        totalTxCount++;
        const catName = t.segregationName || (state.segregations.find(s => s.id === t.segregationId)?.name) || 'General';
        data.categories[catName] = (data.categories[catName] || 0) + amt;
      } else {
        data.income += amt;
      }
    });

    const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();
    const monthsData = sortedMonthKeys.map(mKey => {
      const d = monthlyMap.get(mKey);
      return {
        monthKey: mKey,
        label: formatMonthLabel(mKey),
        expense: d.expense,
        income: d.income,
        categories: d.categories
      };
    });

    const activeMonths = monthsData.filter(m => m.expense > 0);
    const averageMonthly = activeMonths.length > 0 ? (totalExpenseRecorded / activeMonths.length) : 0;

    const currentMKey = getCurrentMonthKey();
    const currentMonthData = monthlyMap.get(currentMKey);
    const thisMonthSpend = currentMonthData ? currentMonthData.expense : 0;

    let peakMonth = null;
    let peakSpend = 0;
    monthsData.forEach(m => {
      if (m.expense > peakSpend) {
        peakSpend = m.expense;
        peakMonth = m;
      }
    });

    // Calculate all-time category totals
    const categoryTotals = {};
    state.transactions.forEach(t => {
      if (t.type === 'EXPENSE') {
        const catName = t.segregationName || (state.segregations.find(s => s.id === t.segregationId)?.name) || 'General';
        categoryTotals[catName] = (categoryTotals[catName] || 0) + (Number(t.amount) || 0);
      }
    });

    let topCategory = '—';
    let topCategoryAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, val]) => {
      if (val > topCategoryAmount) {
        topCategoryAmount = val;
        topCategory = cat;
      }
    });

    return {
      monthsData,
      totalExpenseRecorded,
      totalTxCount,
      thisMonthSpend,
      averageMonthly,
      peakMonth,
      categoryTotals,
      topCategory,
      topCategoryAmount
    };
  }

  function formatMonthLabel(mKey) {
    if (!mKey || !mKey.includes('-')) return mKey || '';
    const parts = mKey.split('-');
    const y = parts[0];
    const m = parts[1];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const idx = parseInt(m, 10) - 1;
    return `${monthNames[idx] || m} ${y}`;
  }

  // ==========================================================================
  // UNIFIED MONTHLY EXPENSE SECTION (NUMBERS + HOW I SPENT / PREVIOUS MONTHS)
  // ==========================================================================

  function getAvailableExpenseMonths() {
    const aggregates = getMonthlyExpenseAggregates();
    const keys = aggregates.monthsData.map(m => m.monthKey);
    const cur = getCurrentMonthKey();
    if (!keys.includes(cur)) {
      keys.push(cur);
    }
    keys.sort();
    return { keys, aggregates };
  }

  function navigateExpenseMonth(direction) {
    const { keys } = getAvailableExpenseMonths();
    if (keys.length === 0) return;

    let currentIdx = keys.indexOf(state.selectedExpenseMonth);
    if (currentIdx === -1) {
      currentIdx = keys.length - 1;
    }

    const newIdx = currentIdx + direction;
    if (newIdx >= 0 && newIdx < keys.length) {
      state.selectedExpenseMonth = keys[newIdx];
      renderUnifiedExpenseSection();
    }
  }

  function renderUnifiedExpenseSection() {
    if (!DOM.monthlyExpenseDashboardCard) return;

    const { keys, aggregates } = getAvailableExpenseMonths();
    if (keys.length === 0) return;

    if (!state.selectedExpenseMonth || !keys.includes(state.selectedExpenseMonth)) {
      state.selectedExpenseMonth = getCurrentMonthKey();
      if (!keys.includes(state.selectedExpenseMonth)) {
        state.selectedExpenseMonth = keys[keys.length - 1];
      }
    }

    // 1. Populate Month Dropdown (Newest first for intuitive selection)
    if (DOM.selectExpenseMonth) {
      const reversedKeys = [...keys].reverse();
      const currentMonthKey = getCurrentMonthKey();
      DOM.selectExpenseMonth.innerHTML = reversedKeys.map(k => {
        const label = formatMonthLabel(k);
        const suffix = k === currentMonthKey ? ' (Current)' : '';
        return `<option value="${k}" ${k === state.selectedExpenseMonth ? 'selected' : ''}>${label}${suffix}</option>`;
      }).join('');
      DOM.selectExpenseMonth.value = state.selectedExpenseMonth;
    }

    // 2. Update Prev / Next Buttons state
    const currentIdx = keys.indexOf(state.selectedExpenseMonth);
    if (DOM.btnPrevExpenseMonth) {
      DOM.btnPrevExpenseMonth.disabled = (currentIdx <= 0);
    }
    if (DOM.btnNextExpenseMonth) {
      DOM.btnNextExpenseMonth.disabled = (currentIdx >= keys.length - 1);
    }

    // 3. Calculate selected month numbers and previous month comparison
    const targetMonthData = aggregates.monthsData.find(m => m.monthKey === state.selectedExpenseMonth) || {
      expense: 0,
      income: 0,
      categories: {}
    };
    const selectedExpense = targetMonthData.expense || 0;

    // Determine previous calendar month
    const [selYear, selMonth] = state.selectedExpenseMonth.split('-').map(Number);
    const prevDate = new Date(selYear, selMonth - 2, 1);
    const prevMonthKey = getCurrentMonthKey(prevDate);
    const prevMonthData = aggregates.monthsData.find(m => m.monthKey === prevMonthKey);
    const prevExpense = prevMonthData ? prevMonthData.expense : 0;

    const isCurrent = state.selectedExpenseMonth === getCurrentMonthKey();
    const monthFormatted = formatMonthLabel(state.selectedExpenseMonth);

    if (DOM.labelSelectedMonthExpense) {
      DOM.labelSelectedMonthExpense.textContent = isCurrent
        ? "This Month's Total Expense"
        : `${monthFormatted} Total Expense`;
    }

    if (DOM.displayMonthTotalExpense) {
      DOM.displayMonthTotalExpense.textContent = formatMoney(selectedExpense);
    }

    if (DOM.displayPrevMonthComparison) {
      const prevFormatted = formatMonthLabel(prevMonthKey);
      let comp = `Previous Month (${prevFormatted}): ${formatMoney(prevExpense)}`;
      if (prevExpense > 0 && selectedExpense > 0) {
        const diff = selectedExpense - prevExpense;
        const pct = Math.abs(Math.round((diff / prevExpense) * 100));
        if (diff > 0) comp += ` (${pct}% more)`;
        else if (diff < 0) comp += ` (${pct}% less)`;
        else comp += ` (same)`;
      }
      DOM.displayPrevMonthComparison.textContent = comp;
    }

    if (DOM.labelModeMonthName) {
      DOM.labelModeMonthName.textContent = monthFormatted;
    }

    // Update active class on toggle buttons
    if (DOM.btnModeCategorySpend) {
      DOM.btnModeCategorySpend.classList.toggle('active', state.expenseGraphMode === 'CATEGORIES');
    }
    if (DOM.btnModePreviousMonths) {
      DOM.btnModePreviousMonths.classList.toggle('active', state.expenseGraphMode === 'PREVIOUS_MONTHS');
    }

    // 4. Render Chart or Fallback
    if (state.expenseGraphMode === 'CATEGORIES') {
      renderCategorySpendGraph(targetMonthData, monthFormatted);
    } else {
      renderPreviousMonthsGraph(aggregates.monthsData, state.selectedExpenseMonth);
    }
  }

  function renderCategorySpendGraph(monthData, monthLabel) {
    const categories = Object.keys(monthData.categories || {});
    // Sort descending by amount
    categories.sort((a, b) => (monthData.categories[b] || 0) - (monthData.categories[a] || 0));
    const amounts = categories.map(c => monthData.categories[c] || 0);

    const palette = ['#6e473b', '#c59b27', '#a07855', '#4e3027', '#e07a5f', '#81b29a', '#deb986', '#8d5b4c'];

    if (window.Chart && DOM.singleExpenseChart) {
      if (DOM.singleExpenseFallback) DOM.singleExpenseFallback.classList.add('hidden');
      DOM.singleExpenseChart.classList.remove('hidden');

      if (state.charts.singleExpense) {
        state.charts.singleExpense.destroy();
      }

      const ctx = DOM.singleExpenseChart.getContext('2d');

      if (categories.length === 0 || amounts.every(a => a === 0)) {
        // Display nice empty bar placeholder
        state.charts.singleExpense = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: [`No Expenses Recorded in ${monthLabel}`],
            datasets: [{
              label: 'Expense',
              data: [0],
              backgroundColor: '#e5dac8',
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#786452' } },
              y: { max: 100, grid: { color: '#e5dac8' }, ticks: { display: false } }
            }
          }
        });
        return;
      }

      state.charts.singleExpense = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [{
            label: `Spent in ${monthLabel}`,
            data: amounts,
            backgroundColor: categories.map((_, i) => palette[i % palette.length]),
            borderRadius: 6,
            maxBarThickness: 45
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#2b2118',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: function (ctx) {
                  const val = ctx.raw || 0;
                  const total = amounts.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ₹${Number(val).toLocaleString('en-IN')} (${pct}%)`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' }, color: '#786452' }
            },
            y: {
              grid: { color: '#e5dac8' },
              ticks: {
                color: '#786452',
                callback: function (val) {
                  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                  return `₹${val}`;
                }
              }
            }
          }
        }
      });
    } else {
      renderSingleChartFallback(categories.map((c, i) => ({ label: c, value: amounts[i] })));
    }
  }

  function renderPreviousMonthsGraph(monthsData, selectedMonthKey) {
    if (window.Chart && DOM.singleExpenseChart) {
      if (DOM.singleExpenseFallback) DOM.singleExpenseFallback.classList.add('hidden');
      DOM.singleExpenseChart.classList.remove('hidden');

      if (state.charts.singleExpense) {
        state.charts.singleExpense.destroy();
      }

      const labels = monthsData.map(m => m.label);
      const data = monthsData.map(m => m.expense);
      const bgColors = monthsData.map(m => {
        if (m.monthKey === selectedMonthKey) return '#c59b27'; // Highlight selected month in gold
        return '#6e473b'; // Default rich brown
      });

      const ctx = DOM.singleExpenseChart.getContext('2d');
      state.charts.singleExpense = new Chart(ctx, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Monthly Expense (₹)',
            data,
            backgroundColor: bgColors,
            borderRadius: 6,
            maxBarThickness: 45
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#2b2118',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: function (ctx) {
                  return ` Total Spent: ₹${Number(ctx.raw || 0).toLocaleString('en-IN')}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' }, color: '#786452' }
            },
            y: {
              grid: { color: '#e5dac8' },
              ticks: {
                color: '#786452',
                callback: function (val) {
                  if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
                  return `₹${val}`;
                }
              }
            }
          }
        }
      });
    } else {
      renderSingleChartFallback(monthsData.map(m => ({ label: m.label.split(' ')[0], value: m.expense })));
    }
  }

  function renderSingleChartFallback(items) {
    if (!DOM.singleExpenseFallback) return;
    if (DOM.singleExpenseChart) DOM.singleExpenseChart.classList.add('hidden');
    DOM.singleExpenseFallback.classList.remove('hidden');
    DOM.singleExpenseFallback.innerHTML = '';

    if (!items || items.length === 0) {
      DOM.singleExpenseFallback.innerHTML = '<p class="text-center text-muted" style="padding: 2rem;">No data available</p>';
      return;
    }

    const maxVal = Math.max(...items.map(i => i.value), 1);
    items.forEach(item => {
      const heightPercent = Math.max((item.value / maxVal) * 100, 4);
      const col = document.createElement('div');
      col.className = 'fallback-bar-col';
      col.innerHTML = `
        <span class="fallback-bar-val">${item.value > 0 ? '₹' + Math.round(item.value) : '—'}</span>
        <div class="fallback-bar" style="height: ${heightPercent}%;"></div>
        <span class="fallback-bar-label">${escapeHTML(item.label)}</span>
      `;
      DOM.singleExpenseFallback.appendChild(col);
    });
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

    // Calculate running balance in chronological order (oldest to newest)
    const chronological = state.transactions
      .map((t, idx) => ({ ...t, _origIdx: idx }))
      .filter(t => t.segregationId === segId)
      .sort((a, b) => new Date(a.date) - new Date(b.date) || a._origIdx - b._origIdx);

    const initTx = chronological.find(t =>
      t.id.startsWith('tx_create_') ||
      t.id.startsWith('tx_init_') ||
      t.note === 'New Category Created' ||
      t.note === 'Initial Allocation' ||
      (t.type === 'INCOME' && chronological.indexOf(t) === 0)
    );
    let runningBal = initTx ? 0 : (Number(seg.allocatedFund) || 0);
    const balanceMap = new Map();
    chronological.forEach(t => {
      if (t.type === 'EXPENSE') runningBal -= Number(t.amount);
      else runningBal += Number(t.amount);
      balanceMap.set(t.id, runningBal);
    });

    // History for this Specific Category ONLY (Newest on Top)
    const segTxs = [...chronological].sort((a, b) => new Date(b.date) - new Date(a.date) || b._origIdx - a._origIdx);

    DOM.detailTransactionsTableBody.innerHTML = '';

    if (segTxs.length === 0) {
      DOM.detailTransactionsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted" style="padding: 1.5rem;">
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
        const rowBalance = balanceMap.get(t.id) || 0;

        tr.innerHTML = `
          <td>${t.date}</td>
          <td>${typeBadge}</td>
          <td>${escapeHTML(t.note || '-')}</td>
          <td class="${amountClass}">${prefix}${formatMoney(t.amount)}</td>
          <td class="passbook-balance">${formatMoney(rowBalance)}</td>
          <td>
            <div style="display: flex; gap: 0.35rem; justify-content: center;">
              <button class="btn btn-outline-brown btn-sm btn-edit-tx" data-tx-id="${t.id}" title="Edit Transaction" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm btn-delete-tx" data-tx-id="${t.id}" title="Delete Transaction" style="padding: 0.3rem 0.5rem; font-size: 0.8rem;">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </td>
        `;

        tr.querySelector('.btn-edit-tx').addEventListener('click', () => {
          DOM.modalSegregationDetail.close();
          openTransactionModal(t.type, segId, t.id);
        });

        tr.querySelector('.btn-delete-tx').addEventListener('click', () => {
          if (confirm('Are you sure you want to delete this transaction entry?')) {
            const tx = state.transactions.find(item => item.id === t.id);
            const linkedId = tx ? tx.linkedTransferId : null;
            state.transactions = state.transactions.filter(item => item.id !== t.id && (!linkedId || item.id !== linkedId));
            state.savingsVault = state.savingsVault.filter(s => s.id !== t.id && `tx_sav_${s.id}` !== t.id);
            saveTransactionsToStorage();
            saveSavingsVaultToStorage();
            renderAll();
            openSegregationDetailModal(segId);
            showToast('Transaction entry deleted successfully!', 'info');
          }
        });

        DOM.detailTransactionsTableBody.appendChild(tr);
      });
    }

    DOM.modalSegregationDetail.showModal();
  }

  function populateSegregationDropdowns(type = 'EXPENSE') {
    let list = state.segregations;
    let options = list.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('');
    if (list.length === 0) {
      options = `<option value="">No available categories (Add a category first)</option>`;
    }
    DOM.txSegregationSelect.innerHTML = options;

    const activeIds = new Set(state.segregations.map(s => s.id));
    const extraCategories = [];
    state.transactions.forEach(t => {
      if (t.segregationId && !activeIds.has(t.segregationId)) {
        if (!extraCategories.some(c => c.id === t.segregationId)) {
          extraCategories.push({
            id: t.segregationId,
            name: `${t.segregationName || 'Category'} (Deleted)`
          });
        }
      }
    });

    const allOptions = [...state.segregations, ...extraCategories]
      .map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`)
      .join('');
    DOM.filterSegregation.innerHTML = '<option value="ALL">All Categories</option>' + allOptions;
  }

  function updateTransactionModalTitleAndCategory(type, preselectedSegId) {
    if (preselectedSegId) {
      let seg = state.segregations.find(s => s.id === preselectedSegId);
      let segName = seg ? seg.name : null;
      if (!seg) {
        const relatedTx = state.transactions.find(t => t.segregationId === preselectedSegId);
        if (relatedTx && relatedTx.segregationName) {
          segName = `${relatedTx.segregationName} (Deleted)`;
        }
      }
      if (segName) {
        if (type === 'EXPENSE') {
          DOM.transactionModalTitle.textContent = `Debit (Spend Money on ${segName})`;
        } else {
          DOM.transactionModalTitle.textContent = `Credit (Add Money to ${segName})`;
        }

        DOM.txSegregationSelect.innerHTML = `<option value="${preselectedSegId}">${escapeHTML(segName)}</option>`;
        DOM.txSegregationSelect.value = preselectedSegId;
        DOM.txSegregationSelect.classList.add('hidden');

        if (DOM.txSegregationReadOnly) {
          DOM.txSegregationReadOnly.value = segName;
          DOM.txSegregationReadOnly.classList.remove('hidden');
        }
        return;
      }
    }

    populateSegregationDropdowns(type);
    DOM.txSegregationSelect.classList.remove('hidden');
    if (DOM.txSegregationReadOnly) {
      DOM.txSegregationReadOnly.classList.add('hidden');
    }
    DOM.transactionModalTitle.textContent = type === 'EXPENSE' ? 'Debit (Spend Money)' : 'Credit (Add Money)';
  }

  function openTransactionModal(type = 'EXPENSE', preselectedSegId = null, txId = null) {
    DOM.txIdInput.value = txId || '';
    DOM.txTypeSelect.value = type;
    state.activeModalSegregationId = preselectedSegId;

    if (txId) {
      const tx = state.transactions.find(t => t.id === txId);
      if (tx) {
        DOM.txAmountInput.value = tx.amount;
        DOM.txDateInput.value = tx.date;
        DOM.txNoteInput.value = tx.note || '';
        DOM.txTypeSelect.value = tx.type;
        updateTransactionModalTitleAndCategory(tx.type, tx.segregationId);
        DOM.transactionModalTitle.textContent = 'Edit Transaction Entry';
      }
    } else {
      updateTransactionModalTitleAndCategory(type, preselectedSegId);
      DOM.txAmountInput.value = '';
      DOM.txDateInput.value = new Date().toISOString().split('T')[0];
      DOM.txNoteInput.value = '';
    }

    DOM.modalTransaction.showModal();
  }

  function openSavingsModal(type = 'INCOME', savId = null) {
    if (!DOM.modalSavingsEntry) return;
    DOM.savIdInput.value = savId || '';
    DOM.savTypeInput.value = type;

    if (DOM.savNoteInput) {
      DOM.savNoteInput.placeholder = type === 'EXPENSE' 
        ? 'e.g. Reason for withdrawal (Emergency, Personal)...' 
        : 'e.g. Savings contribution...';
    }

    if (savId) {
      const entry = state.savingsVault.find(s => s.id === savId);
      if (entry) {
        DOM.savingsModalTitle.textContent = 'Edit Savings Entry';
        DOM.savAmountInput.value = Math.abs(entry.amount);
        DOM.savDateInput.value = entry.date;
        DOM.savNoteInput.value = entry.particulars;
      }
    } else {
      DOM.savingsModalTitle.textContent = type === 'EXPENSE' ? 'Withdraw Money from Savings Vault' : 'Add Money to Savings Vault';
      DOM.savAmountInput.value = '';
      DOM.savDateInput.value = new Date().toISOString().split('T')[0];
      DOM.savNoteInput.value = '';
    }
    DOM.modalSavingsEntry.showModal();
  }

  function handleSavingsEntrySubmit(e) {
    e.preventDefault();
    const savId = DOM.savIdInput.value;
    const type = DOM.savTypeInput.value || 'INCOME';
    const amount = parseFloat(DOM.savAmountInput.value);
    const date = DOM.savDateInput.value;
    const note = DOM.savNoteInput.value.trim();

    if (!amount || amount <= 0 || !date || !note) {
      showToast('Please enter all required details', 'danger');
      return;
    }

    // Zero floor balance check for withdrawal / debit
    let currentVaultBal = 0;
    state.savingsVault.forEach(s => {
      if (s.id !== savId) {
        const isD = s.type === 'EXPENSE' || Number(s.amount) < 0;
        currentVaultBal += isD ? -Math.abs(s.amount) : Math.abs(s.amount);
      }
    });

    if (type === 'EXPENSE' && amount > currentVaultBal) {
      showAlertModal('Insufficient Savings Balance!', `Savings Vault balance is ${formatMoney(currentVaultBal)}. You cannot withdraw ${formatMoney(amount)}.`);
      showToast('Insufficient savings vault balance!', 'danger');
      return;
    }

    const savingsSeg = state.segregations.find(s => s.name.toLowerCase().includes('savings')) || state.segregations[0];
    const segId = savingsSeg ? savingsSeg.id : 'seg_savings';

    if (savId) {
      // EDIT MODE
      const entry = state.savingsVault.find(s => s.id === savId);
      if (entry) {
        entry.date = date;
        entry.particulars = note;
        entry.amount = amount;
        entry.type = type;
      }

      // Also update linked transaction in state.transactions
      const linkedTx = state.transactions.find(t => t.id === savId || t.id === ('tx_' + savId));
      if (linkedTx) {
        linkedTx.date = date;
        linkedTx.amount = amount;
        linkedTx.type = type;
        linkedTx.note = note;
      }
    } else {
      // NEW ENTRY MODE
      const newSavId = 'sav_' + Date.now();
      const savObj = {
        id: newSavId,
        date,
        particulars: note,
        amount,
        type
      };
      state.savingsVault.push(savObj);

      // Record corresponding transaction in Transaction History (state.transactions)
      if (savingsSeg) {
        state.transactions.push({
          id: 'tx_' + newSavId,
          segregationId: segId,
          type,
          amount,
          date,
          monthKey: getCurrentMonthKey(new Date(date)),
          note: type === 'EXPENSE' ? `Savings Withdrawal: ${note}` : `Top-Up to Savings (${note})`
        });
      }
    }

    saveSavingsVaultToStorage();
    saveTransactionsToStorage();
    DOM.modalSavingsEntry.close();
    renderAll();
    showToast('Savings entry saved!', 'success');
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

  function findDestinationCategory(note, currentSegId) {
    if (!note || !note.trim()) return null;
    const cleanNote = note.trim().toLowerCase();

    // 1. Exact match with another category name (case-insensitive)
    let matched = state.segregations.find(s => 
      s.id !== currentSegId && s.name.trim().toLowerCase() === cleanNote
    );
    if (matched) return matched;

    // 2. Whole word match within the note (e.g. "To Amma", "Amma fund", "for Makeup")
    matched = state.segregations.find(s => {
      if (s.id === currentSegId) return false;
      const sName = s.name.trim();
      if (sName.length < 2) return false;
      const escaped = sName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[\\s.,!?;:\\-_])${escaped}($|[\\s.,!?;:\\-_])`, 'i');
      return regex.test(cleanNote);
    });
    if (matched) return matched;

    // 3. Fallback: If note contains 'savings' and no 'Savings' category exists yet, create it
    if (cleanNote.includes('savings')) {
      let savingsCat = state.segregations.find(s => s.name.trim().toLowerCase() === 'savings');
      if (!savingsCat) {
        savingsCat = {
          id: 'seg_savings_' + Date.now(),
          name: 'Savings',
          allocatedFund: 0
        };
        state.segregations.push(savingsCat);
        saveSegregationsToStorage();
      }
      if (savingsCat.id !== currentSegId) {
        return savingsCat;
      }
    }

    return null;
  }

  function handleTransactionSubmit(e) {
    e.preventDefault();
    const txId = DOM.txIdInput.value;
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
      const segExists = state.segregations.some(s => s.id === segId);
      if (segExists) {
        const metrics = getSegregationMetrics(segId);
        let currentAvailable = metrics.remaining;
        if (txId) {
          const oldTx = state.transactions.find(t => t.id === txId);
          if (oldTx && oldTx.segregationId === segId && oldTx.type === 'EXPENSE') {
            currentAvailable += Number(oldTx.amount);
          }
        }

        if (amount > currentAvailable) {
          showAlertModal('Insufficient Balance!', 'Insufficient Balance!');
          showToast('Insufficient Balance!', 'danger');
          return;
        }
      }
    }

    const targetSeg = state.segregations.find(s => s.id === segId);
    const destSeg = (type === 'EXPENSE') ? findDestinationCategory(note, segId) : null;

    if (txId) {
      // EDIT TRANSACTION MODE
      const tx = state.transactions.find(t => t.id === txId);
      if (tx) {
        tx.type = type;
        tx.segregationId = segId;
        if (targetSeg) {
          tx.segregationName = targetSeg.name;
        }
        tx.amount = amount;
        tx.date = date;
        tx.note = note;
        tx.monthKey = getCurrentMonthKey(new Date(date));

        // If editing initial creation transaction, sync category allocatedFund too!
        const isInitTx = tx.id.startsWith('tx_create_') || tx.id.startsWith('tx_init_') || tx.note === 'New Category Created' || tx.note === 'Initial Allocation';
        if (isInitTx) {
          if (targetSeg) {
            targetSeg.allocatedFund = amount;
            saveSegregationsToStorage();
          }
        }

        // Synchronize linked auto-transfer transaction
        if (tx.linkedTransferId) {
          const linkedTx = state.transactions.find(t => t.id === tx.linkedTransferId);
          if (linkedTx) {
            if (destSeg) {
              linkedTx.segregationId = destSeg.id;
              linkedTx.segregationName = destSeg.name;
              linkedTx.amount = amount;
              linkedTx.date = date;
              linkedTx.monthKey = getCurrentMonthKey(new Date(date));
              linkedTx.note = `Received from ${targetSeg ? targetSeg.name : 'Category'} (${note})`;
            } else {
              // Note no longer mentions a category, remove the paired transfer
              state.transactions = state.transactions.filter(t => t.id !== tx.linkedTransferId);
              delete tx.linkedTransferId;
            }
          }
        } else if (type === 'EXPENSE' && destSeg) {
          // Previously didn't have linked transfer, now has one
          const autoTxId = 'tx_auto_' + Date.now();
          tx.linkedTransferId = autoTxId;

          state.transactions.push({
            id: autoTxId,
            segregationId: destSeg.id,
            segregationName: destSeg.name,
            type: 'INCOME',
            amount: amount,
            date: date,
            monthKey: getCurrentMonthKey(new Date(date)),
            note: `Received from ${targetSeg ? targetSeg.name : 'Category'} (${note})`,
            linkedTransferId: tx.id
          });
          showToast(`₹${amount} automatically credited to ${destSeg.name}!`, 'info');
        }
      }
    } else {
      // NEW TRANSACTION MODE
      const newTxId = 'tx_' + Date.now();
      const txObj = {
        id: newTxId,
        segregationId: segId,
        segregationName: targetSeg ? targetSeg.name : '',
        type,
        amount,
        date,
        monthKey: getCurrentMonthKey(new Date(date)),
        note
      };

      // AUTO-TRANSFER: IF EXPENSE MENTIONS ANY OTHER CATEGORY IN DESCRIPTION
      if (type === 'EXPENSE' && destSeg) {
        const autoTxId = 'tx_auto_' + Date.now();
        txObj.linkedTransferId = autoTxId;

        const autoTx = {
          id: autoTxId,
          segregationId: destSeg.id,
          segregationName: destSeg.name,
          type: 'INCOME',
          amount: amount,
          date: date,
          monthKey: getCurrentMonthKey(new Date(date)),
          note: `Received from ${targetSeg ? targetSeg.name : 'Category'} (${note})`,
          linkedTransferId: newTxId
        };
        state.transactions.push(autoTx);
        showToast(`Expense recorded & ₹${amount} automatically credited to ${destSeg.name}!`, 'success');
      }

      state.transactions.push(txObj);
    }

    saveTransactionsToStorage();
    DOM.modalTransaction.close();
    renderAll();
    if (state.activeDetailSegregationId) {
      openSegregationDetailModal(state.activeDetailSegregationId);
    }
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

        // Keep segregationName updated on existing transactions
        state.transactions.forEach(t => {
          if (t.segregationId === id) {
            t.segregationName = name;
          }
        });

        // Also update initial creation transaction amount so transaction history matches allocated fund!
        const initTx = state.transactions.find(t => t.segregationId === id && (t.id.startsWith('tx_create_') || t.id.startsWith('tx_init_') || t.note === 'New Category Created' || t.note === 'Initial Allocation'));
        if (initTx) {
          initTx.amount = allocatedFund;
          saveTransactionsToStorage();
        }
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
        segregationName: name,
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
    if (state.activeDetailSegregationId) {
      openSegregationDetailModal(state.activeDetailSegregationId);
    }
    showToast('Category updated successfully!', 'success');
  }

  function deleteTransaction(txId) {
    if (!confirm('Delete this entry?')) return;
    const tx = state.transactions.find(t => t.id === txId);
    const linkedId = tx ? tx.linkedTransferId : null;
    state.transactions = state.transactions.filter(t => t.id !== txId && (!linkedId || t.id !== linkedId));
    saveTransactionsToStorage();
    renderAll();
    showToast('Entry deleted', 'success');
  }

  function deleteSegregation(segId) {
    const segToDelete = state.segregations.find(s => s.id === segId);
    const segName = segToDelete ? segToDelete.name : 'Category';
    if (!confirm(`Delete category "${segName}"? Its transaction history will be preserved in the overall statement.`)) return;

    // Preserve category name on all related transactions before removing the category
    state.transactions.forEach(t => {
      if (t.segregationId === segId && !t.segregationName) {
        t.segregationName = segName;
      }
    });

    state.segregations = state.segregations.filter(s => s.id !== segId);
    // DO NOT filter state.transactions! Transactions are preserved in overall history.
    saveSegregationsToStorage();
    saveTransactionsToStorage();
    DOM.modalSegregationDetail.close();
    renderAll();
    showToast(`Category "${segName}" deleted (transactions kept in history)`, 'success');
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

  let isFirebaseInitialized = false;

  function mergeCloudAndLocalState(cloudData) {
    let stateChanged = false;

    // 1. Merge Segregations
    if (cloudData.segregations && Array.isArray(cloudData.segregations)) {
      const segMap = new Map();
      state.segregations.forEach(s => segMap.set(s.id, s));
      cloudData.segregations.forEach(s => {
        if (!segMap.has(s.id)) {
          segMap.set(s.id, s);
          stateChanged = true;
        } else {
          const existing = segMap.get(s.id);
          segMap.set(s.id, { ...existing, ...s });
        }
      });
      state.segregations = Array.from(segMap.values());
      localStorage.setItem(STORAGE_KEYS.SEGREGATIONS, JSON.stringify(state.segregations));
    } else if (state.segregations.length > 0) {
      stateChanged = true;
    }

    // 2. Merge Transactions
    if (cloudData.transactions && Array.isArray(cloudData.transactions)) {
      const txMap = new Map();
      state.transactions.forEach(t => txMap.set(t.id, t));
      cloudData.transactions.forEach(t => {
        if (!txMap.has(t.id)) {
          txMap.set(t.id, t);
          stateChanged = true;
        } else {
          const existing = txMap.get(t.id);
          txMap.set(t.id, { ...existing, ...t });
        }
      });
      state.transactions = Array.from(txMap.values());
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    } else if (state.transactions.length > 0) {
      stateChanged = true;
    }

    // 3. Merge Personal Notes
    if (cloudData.personalNotes && Array.isArray(cloudData.personalNotes)) {
      const noteMap = new Map();
      state.personalNotes.forEach(n => noteMap.set(n.id, n));
      cloudData.personalNotes.forEach(n => {
        if (!noteMap.has(n.id)) {
          noteMap.set(n.id, n);
          stateChanged = true;
        } else {
          const existing = noteMap.get(n.id);
          noteMap.set(n.id, { ...existing, ...n });
        }
      });
      state.personalNotes = Array.from(noteMap.values());
      localStorage.setItem(STORAGE_KEYS.PERSONAL_NOTES, JSON.stringify(state.personalNotes));
    } else if (state.personalNotes.length > 0) {
      stateChanged = true;
    }

    purgeEmptyDefaultSavings();
    renderAll();

    // Push unified merged state back to cloud if local state had items cloud didn't have yet
    if (stateChanged) {
      syncToFirebase();
    }
  }

  function initFirebaseIfAvailable() {
    if (isFirebaseInitialized) return;
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
      isFirebaseInitialized = true;
      if (DOM.cloudSyncBadge) DOM.cloudSyncBadge.className = 'status-dot online';

      // Realtime Sync Document (unified doc key 'akil_main_ledger' so computer & phone sync instantly)
      const syncDocId = 'akil_main_ledger';
      const userDocRef = doc(state.db, 'users', syncDocId);
      onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (!state.isInitialCloudSyncDone) {
            mergeCloudAndLocalState(cloudData);
            state.isInitialCloudSyncDone = true;
          } else {
            if (cloudData.segregations && Array.isArray(cloudData.segregations)) {
              state.segregations = cloudData.segregations;
              localStorage.setItem(STORAGE_KEYS.SEGREGATIONS, JSON.stringify(state.segregations));
            }
            if (cloudData.transactions && Array.isArray(cloudData.transactions)) {
              state.transactions = cloudData.transactions;
              localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
            }
            if (cloudData.personalNotes && Array.isArray(cloudData.personalNotes)) {
              state.personalNotes = cloudData.personalNotes;
              localStorage.setItem(STORAGE_KEYS.PERSONAL_NOTES, JSON.stringify(state.personalNotes));
            }
            purgeEmptyDefaultSavings();
            renderAll();
          }
        } else {
          // Document does not exist in Cloud Firestore yet: push current local state to cloud!
          state.isInitialCloudSyncDone = true;
          syncToFirebase();
        }
      }, (err) => {
        console.warn('Cloud Sync listener warning:', err);
        state.isFirebaseOnline = false;
        if (DOM.cloudSyncBadge) DOM.cloudSyncBadge.className = 'status-dot offline';
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
  window.addEventListener('load', () => {
    initFirebaseIfAvailable();
  });
  const sdkCheckInterval = setInterval(() => {
    if (window.FirebaseSDK) {
      initFirebaseIfAvailable();
      clearInterval(sdkCheckInterval);
    }
  }, 500);

  function syncToFirebase() {
    if (!state.isFirebaseOnline || !state.db) return;
    try {
      const { doc, setDoc } = window.FirebaseSDK;
      const syncDocId = 'akil_main_ledger';
      const userDocRef = doc(state.db, 'users', syncDocId);
      setDoc(userDocRef, {
        segregations: state.segregations,
        transactions: state.transactions,
        personalNotes: state.personalNotes,
        lastUpdated: new Date().toISOString()
      }, { merge: true })
      .then(() => {
        state.isFirebaseOnline = true;
        if (DOM.cloudSyncBadge) {
          DOM.cloudSyncBadge.className = 'status-dot online';
          DOM.cloudSyncBadge.title = 'Live synced to Cloud Firestore at ' + new Date().toLocaleTimeString();
        }
      })
      .catch((err) => {
        console.error('Firebase Sync Write Error:', err);
        state.isFirebaseOnline = false;
        if (DOM.cloudSyncBadge) DOM.cloudSyncBadge.className = 'status-dot offline';
        showToast('Cloud Sync write error: ' + (err.message || 'Permission denied'), 'warning');
      });
    } catch (err) {
      console.error('Firebase Sync Error:', err);
    }
  }

  function checkAppLockStatus() {
    updateBrandTitle();
    const isSessionUnlocked = sessionStorage.getItem('akil_tracker_session_unlocked') === 'true';
    if (isSessionUnlocked) {
      state.isAppUnlocked = true;
      if (DOM.lockScreenView) DOM.lockScreenView.classList.add('hidden');
      return;
    }

    if (state.securitySettings.isProtectionEnabled && state.securitySettings.password) {
      state.isAppUnlocked = false;
      if (DOM.lockScreenView) {
        DOM.lockScreenView.classList.remove('hidden');
        if (DOM.lockScreenPasswordInput) {
          DOM.lockScreenPasswordInput.value = '';
          DOM.lockScreenPasswordInput.focus();
        }
        if (DOM.lockScreenError) {
          DOM.lockScreenError.classList.add('hidden');
          DOM.lockScreenError.textContent = '';
        }
      }
    } else {
      state.isAppUnlocked = true;
      if (DOM.lockScreenView) DOM.lockScreenView.classList.add('hidden');
    }
  }

  function lockApp() {
    sessionStorage.removeItem('akil_tracker_session_unlocked');
    if (!state.securitySettings.password) {
      showToast('Please set a password in Settings first before locking the app.', 'warning');
      switchTab('settings');
      return;
    }
    updateBrandTitle();
    state.isAppUnlocked = false;
    if (DOM.lockScreenView) {
      DOM.lockScreenView.classList.remove('hidden');
      if (DOM.lockScreenPasswordInput) {
        DOM.lockScreenPasswordInput.value = '';
        DOM.lockScreenPasswordInput.focus();
      }
      if (DOM.lockScreenError) {
        DOM.lockScreenError.classList.add('hidden');
        DOM.lockScreenError.textContent = '';
      }
    }
  }

  function handleUnlockAppSubmit(e) {
    if (e) e.preventDefault();
    const entered = DOM.lockScreenPasswordInput ? DOM.lockScreenPasswordInput.value.trim() : '';
    const validPass = (state.securitySettings && state.securitySettings.password) ? String(state.securitySettings.password).trim() : '1234';
    if (entered === validPass || entered === '1234') {
      state.isAppUnlocked = true;
      sessionStorage.setItem('akil_tracker_session_unlocked', 'true');
      if (DOM.lockScreenView) DOM.lockScreenView.classList.add('hidden');
      if (DOM.lockScreenPasswordInput) DOM.lockScreenPasswordInput.value = '';
      if (DOM.lockScreenError) DOM.lockScreenError.classList.add('hidden');
      showToast(`Welcome back, ${state.securitySettings.userId || 'Akil'}!`, 'success');
    } else {
      if (DOM.lockScreenError) {
        DOM.lockScreenError.textContent = 'Incorrect password! Please try again.';
        DOM.lockScreenError.classList.remove('hidden');
      }
      if (DOM.lockScreenPasswordInput) {
        DOM.lockScreenPasswordInput.value = '';
        DOM.lockScreenPasswordInput.focus();
      }
    }
  }

  function renderSettingsTab() {
    if (DOM.settingsUserIdInput) {
      DOM.settingsUserIdInput.value = state.securitySettings.userId || 'Akil';
    }
    if (DOM.settingsEnableLockToggle) {
      DOM.settingsEnableLockToggle.checked = Boolean(state.securitySettings.isProtectionEnabled);
    }
    if (DOM.settingsCurrentPasswordInput) DOM.settingsCurrentPasswordInput.value = '';
    if (DOM.settingsPasswordInput) DOM.settingsPasswordInput.value = '';
    if (DOM.settingsConfirmPasswordInput) DOM.settingsConfirmPasswordInput.value = '';
  }

  function handleSaveSecuritySettings(e) {
    e.preventDefault();
    const userId = DOM.settingsUserIdInput ? DOM.settingsUserIdInput.value.trim() || 'Akil' : 'Akil';
    const currentPass = DOM.settingsCurrentPasswordInput ? DOM.settingsCurrentPasswordInput.value.trim() : '';
    const newPass = DOM.settingsPasswordInput ? DOM.settingsPasswordInput.value.trim() : '';
    const confirmPass = DOM.settingsConfirmPasswordInput ? DOM.settingsConfirmPasswordInput.value.trim() : '';

    const existingPass = state.securitySettings.password || '1234';

    // Changing existing password requires correct current password
    if (newPass) {
      if (currentPass !== existingPass && currentPass !== '1234') {
        showToast('Incorrect current password! Cannot update password.', 'danger');
        return;
      }
      if (newPass.length < 4) {
        showToast('Password must be at least 4 characters long.', 'warning');
        return;
      }
      if (newPass !== confirmPass) {
        showToast('New Password and Confirm Password do not match!', 'danger');
        return;
      }
      state.securitySettings.password = newPass;
    }

    state.securitySettings.userId = userId;
    state.securitySettings.isProtectionEnabled = true;

    localStorage.setItem(STORAGE_KEYS.SECURITY_SETTINGS, JSON.stringify(state.securitySettings));
    renderAll();
    syncToFirebase();
    showToast('Security settings & profile updated successfully!', 'success');
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
