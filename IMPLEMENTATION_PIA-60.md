# Implementation: PIA-60 - Show Only Modified/New Contracts on Main Page

## Summary
Updated the Contracts List Page to display only modified/new contracts instead of all contracts. Modified/new contracts are identified by comparing the current contract files with the data stored in Neo4j database using file hash comparison.

## Changes Made

### 1. Frontend - ContractsListPage Component (`frontend/src/pages/ContractsListPage.tsx`)

**Key Changes:**
- Added filtering logic to show only contracts that appear in the `checkModifiedData.changes` array
- Created `modifiedContracts` array that filters contracts based on file path matching with changes
- Added `getContractStatus()` helper function to retrieve the status (modified/added/removed) for each contract
- Updated the card title from "📋 Contracts List" to "📋 Modified/New Contracts"
- Updated the "no contracts" message to "No modified or new contracts found. All contracts are up to date with the database."
- Refactored conditional rendering to use ternary operators for better TypeScript type inference
- Pass the `status` prop to each `ContractCard` component

**Logic:**
```typescript
// Filter contracts to show only modified/new ones
const modifiedContracts = contracts?.filter(contract => {
  if (!checkModifiedData?.changes) return false;
  return checkModifiedData.changes.some(change => 
    change.filePath === contract.filePath
  );
}) || [];

// Get the status for a contract
const getContractStatus = (filePath: string): 'modified' | 'added' | 'removed' | undefined => {
  const change = checkModifiedData?.changes?.find(c => c.filePath === filePath);
  return change?.status;
};
```

### 2. Frontend - ContractCard Component (`frontend/src/components/ContractCard.tsx`)

**Key Changes:**
- Added `status` prop to the `ContractCardProps` interface with type `'modified' | 'added' | 'removed' | undefined`
- Created `getStatusChip()` helper function that renders a colored status badge:
  - **✨ New** (green/success) for added contracts
  - **🔄 Modified** (orange/warning) for modified contracts
  - **🗑️ Removed** (red/error) for removed contracts
- Updated the card header layout to display the status chip alongside the category chip
- Status chip is only displayed when the `status` prop is provided

### 3. Integration Tests Updates

#### Updated Test Fixtures (`frontend/tests/fixtures/contracts-data.ts`)
- Mock data already included `mockCheckModified` and `mockCheckModifiedApiResponses` for testing

#### Updated Page Object (`frontend/tests/pages/ContractsListPage.ts`)
- Changed `contractsCardTitle` locator to look for "📋 Modified/New Contracts"
- Changed `noContractsAlert` locator to match new text: "No modified or new contracts found"

#### Updated Tests (`frontend/tests/contracts-list.spec.ts`)
- Updated all tests to mock both `/api/contracts` and `/api/contracts/check-if-contract-modified` endpoints
- Renamed test: "should display contracts when API returns data" → "should display only modified/new contracts when API returns data with changes"
- Renamed test: "should display 'No contracts found' message" → "should display 'No modified or new contracts' message when there are no changes"
- Added new test: "should display error message when check-modified API fails"
- Updated test: "should display all contract details correctly" → "should display modified contract details correctly with status badge"
- Updated multiple tests to create appropriate mock responses for the check-modified endpoint
- Updated expectations to reflect that only modified/new contracts are shown

#### Updated Verify Button Tests (`frontend/tests/contract-verify-button.spec.ts`)
- All tests already properly mock both endpoints
- Tests remain valid as the button behavior is unchanged

## Acceptance Criteria Met

✅ **Show only modified/new contracts on main page**
- The page now filters and displays only contracts that appear in the `changes` array from the check-modified endpoint

✅ **Modified/new contracts mean contract with changes not saved in Neo4j**
- Contracts are identified as modified/new by the backend's `checkIfContractsModified` endpoint, which compares file hashes

✅ **These changes can be compared with hashes if it was modified**
- The backend uses SHA256 file hashes to detect modifications by comparing:
  - `currentHash`: Hash of the current contract file
  - `storedHash`: Hash stored in Neo4j database
  - If hashes differ → status is "modified"
  - If storedHash is null → status is "added"

## Technical Details

### How It Works
1. The page fetches all contracts via `/api/contracts`
2. Simultaneously, it checks for modifications via `/api/contracts/check-if-contract-modified`
3. The check-modified endpoint returns a list of changes with:
   - `moduleId`: The contract's module ID
   - `fileName`: The contract file name
   - `filePath`: The full path to the contract
   - `currentHash`: Current SHA256 hash
   - `storedHash`: Hash from Neo4j (null if new)
   - `status`: "modified" | "added" | "removed"
4. The frontend filters the contracts array to include only those with matching `filePath` in the changes array
5. Each displayed contract shows a status badge indicating whether it's new, modified, or removed

### User Experience
- Users now see only contracts that need attention (modified or new)
- Status badges provide clear visual indication of the type of change
- The "Verify Contracts" button remains disabled when no changes are detected
- Clear messaging when no modified/new contracts exist

## Testing
- ✅ TypeScript compilation successful
- ✅ Frontend build successful
- ✅ All integration tests updated to reflect new behavior
- ✅ Page object model updated
- ✅ Test fixtures provide comprehensive mock data

## Files Modified
1. `frontend/src/pages/ContractsListPage.tsx` - Main page logic
2. `frontend/src/components/ContractCard.tsx` - Added status badge
3. `frontend/tests/pages/ContractsListPage.ts` - Updated page object
4. `frontend/tests/contracts-list.spec.ts` - Updated tests
