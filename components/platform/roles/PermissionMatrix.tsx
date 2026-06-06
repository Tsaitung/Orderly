'use client'

import {
  ControlPanel,
  LoadingSkeleton,
  MatrixTable,
  StatsSummary,
  usePermissionMatrix,
} from './permission-matrix'

export function PermissionMatrix(): JSX.Element {
  const {
    filteredRoles,
    filteredCategories,
    changes,
    loading,
    saving,
    searchTerm,
    selectedRoleTypes,
    showSystemRoles,
    showInactiveRoles,
    editMode,
    totalChanges,
    hasConflicts,
    setSearchTerm,
    setSelectedRoleTypes,
    setShowSystemRoles,
    setShowInactiveRoles,
    setEditMode,
    toggleCategory,
    handlePermissionToggle,
    saveChanges,
    cancelChanges,
    exportMatrix,
    checkConflicts,
  } = usePermissionMatrix()

  if (loading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      <ControlPanel
        searchTerm={searchTerm}
        selectedRoleTypes={selectedRoleTypes}
        showSystemRoles={showSystemRoles}
        showInactiveRoles={showInactiveRoles}
        editMode={editMode}
        totalChanges={totalChanges}
        hasConflicts={hasConflicts}
        saving={saving}
        onSearchChange={setSearchTerm}
        onRoleTypesChange={setSelectedRoleTypes}
        onShowSystemRolesChange={setShowSystemRoles}
        onShowInactiveRolesChange={setShowInactiveRoles}
        onEditModeChange={setEditMode}
        onCheckConflicts={checkConflicts}
        onExportMatrix={exportMatrix}
        onSaveChanges={saveChanges}
        onCancelChanges={cancelChanges}
      />

      <MatrixTable
        roles={filteredRoles}
        categories={filteredCategories}
        editMode={editMode}
        changes={changes}
        onToggleCategory={toggleCategory}
        onPermissionToggle={handlePermissionToggle}
      />

      <StatsSummary
        rolesCount={filteredRoles.length}
        categories={filteredCategories}
        totalChanges={totalChanges}
        hasConflicts={hasConflicts}
      />
    </div>
  )
}
