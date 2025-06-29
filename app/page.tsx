Here's the fixed version with all missing closing brackets added:

The main issues were in the `handleSetAsReference` callback where there was some misplaced code and missing brackets. Here's the corrected version of that section:

```javascript
const handleSetAsReference = useCallback((timezone: TimezoneData) => {
    // Move current reference to the timezone list
    const currentReference = referenceTimezone;
    
    if (activeWorkspace) {
      // For workspaces, remove from workspace-specific storage and add current reference
      const currentWorkspaceTimezones = getWorkspaceTimezones(activeWorkspace.id);
      const updatedWorkspaceTimezones = [
        ...currentWorkspaceTimezones.filter(tz => tz.id !== timezone.id),
        currentReference
      ];
      
      // Update workspace-specific storage
      const workspaceTimezones = JSON.parse(localStorage.getItem('world-clock-workspace-timezones') || '{}');
      workspaceTimezones[activeWorkspace.id] = updatedWorkspaceTimezones;
      localStorage.setItem('world-clock-workspace-timezones', JSON.stringify(workspaceTimezones));
      
      // Update workspace timezone ID list
      removeTimezoneFromWorkspace(activeWorkspace.id, timezone.id);
      if (currentReference.id !== 'local') {
        addTimezoneToWorkspace(activeWorkspace.id, currentReference.id);
      }
    } else {
      // For no workspace (global), use global timezone list
      setTimeState(prev => ({
        ...prev,
        timezones: [
          ...prev.timezones.filter(tz => tz.id !== timezone.id && tz.id !== currentReference.id), 
          currentReference
        ],
      }));
    }
    
    // Convert the current selected time to the new reference timezone
    const convertedTime = convertTime(
      timeState.selectedTime,
      currentReference.offset,
      timezone.offset
    );
    
    // Set the new reference timezone
    setReferenceTimezone(timezone);
    setHasUserSetReference(true);
    
    // Update the time state with the converted time
    setTimeState(prev => ({
      ...prev,
      selectedTime: convertedTime,
      referenceTime: convertedTime,
    }));
}, [referenceTimezone, timeState.selectedTime, activeWorkspace, getWorkspaceTimezones, removeTimezoneFromWorkspace, addTimezoneToWorkspace]);
```

The rest of the file remains unchanged. This fixes the syntax errors and properly closes all brackets and parentheses.