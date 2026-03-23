# Allowing Selection of Existing Managers for Branches (Optional Manager)

As requested, the manager assignment will no longer be mandatory. We will update the system so the user can choose to:
1. Create a branch without any manager at all.
2. Select an existing manager from a dropdown.
3. Create a new manager.

## Proposed Changes

### Backend

#### [MODIFY] `src/controllers/branchController.js`
- **createBranch**: 
  - Update destructuring to extract `managerId` from `req.body`.
  - Handle the logic: Manager assignment is completely optional.
  - If `managerId` is provided, fetch the existing user, update their `assignedBranches` to include the newly created branch (if not already present), and set the branch's `manager` field to this user.
  - Retain the existing logic to create a new user if `managerEmail`, `managerPassword`, etc. are provided.
- **updateBranch**:
  - Update destructuring to extract `managerId` from `req.body`.
  - Also allow removing the manager string/object if they choose to unassign.
  - Handle the logic: Update the branch's manager to the existing user if `managerId` is passed, making sure to also give the user access to this branch by updating `assignedBranches`.

### Frontend

#### [MODIFY] `src/pages/BranchManagement.jsx`
- **State Updates**: 
  - Fetch existing users from the backend (`/auth/users?limit=100` or similar for the current tenant).
  - Add a state `managerSelectionMode` initialized to `'none'` (No Manager), `'existing'`, or `'new'`.
  - Update the `form` state to include `managerId: ''`.
- **UI Updates**:
  - Make the Branch Manager section optional by adding a clear set of options (e.g. tabs or radio buttons): "بدون مدير" (No Manager), "اختيار مدير موجود" (Choose existing manager), and "إضافة مدير جديد" (Add new manager).
  - When "No Manager" is active: Hide all manager-related inputs.
  - When "Choose existing manager" is active: Show a `<Select>` dropdown with a searchable list of existing users to choose from.
  - When "Add new manager" is active: Show the detailed form (Name, Email, Phone, Password).
- **Functionality**:
  - Update `handleSave` to skip validation for manager fields if `managerSelectionMode` is "none".
  - Send the correct payload (`managerId` or new user info) based on the active mode.

## Verification Plan

### Manual Verification
1. Run `npm run dev` in the frontend and backend.
2. Go to the "إدارة الفروع" (Branch Management) page.
3. Click "إضافة فرع جديد" (Add New Branch).
4. Verify there are clear options for the manager (None, Existing, New).
5. Test adding a branch **without** setting a manager, save, and ensure it correctly creates.
6. Test adding a branch by selecting an **existing manager**, save, and ensure user assignment updates.
7. Test adding a branch with a **new manager**, save, and verify.
8. Edit the branch, remove the manager or change it, save, and verify the changes apply.
