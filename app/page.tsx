'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Globe, Plus, Settings, Share2, MapPin, Calendar, Users } from 'lucide-react';
import { TimezoneCard } from '@/components/timezone-card';
import { AddTimezoneDialog } from '@/components/add-timezone-dialog';
import { TimeSelector } from '@/components/time-selector';
import { ShareButton } from '@/components/share-button';
import { WorkspaceSelector } from '@/components/workspace-selector';
import { CreateWorkspaceDialog } from '@/components/create-workspace-dialog';
import { ManageWorkspacesDialog } from '@/components/manage-workspaces-dialog';
import { SortableTimezoneCard } from '@/components/sortable-timezone-card';
import { TimezoneData, TimeState } from '@/types/timezone';
import { Workspace } from '@/types/workspace';
import { convertTime, formatTime, getTimezoneOffset } from '@/lib/timezone-utils';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { useGeolocation } from '@/hooks/use-geolocation';
import { useIpTimezone } from '@/hooks/use-ip-timezone';
import { useUrlState } from '@/hooks/use-url-state';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

export default function WorldClockPage() {
  const [timeState, setTimeState] = useState<TimeState>({
    selectedTime: new Date(),
    referenceTime: new Date(),
    timezones: [],
  });

  const [referenceTimezone, setReferenceTimezone] = useState<TimezoneData>({
    id: 'local',
    name: 'Local Time',
    city: 'Your Location',
    country: '',
    offset: 0,
  });

  const [hasUserSetReference, setHasUserSetReference] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const [isManageWorkspacesOpen, setIsManageWorkspacesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('clock');

  const { location } = useGeolocation();
  const { timezone: ipTimezone } = useIpTimezone();
  
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    createWorkspace,
    deleteWorkspace,
    updateWorkspace,
    addTimezoneToWorkspace,
    removeTimezoneFromWorkspace,
    getWorkspaceTimezones,
    reorderWorkspaceTimezones
  } = useWorkspaces();

  const { updateUrl, getInitialState } = useUrlState();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize from URL state
  useEffect(() => {
    const initialState = getInitialState();
    if (initialState) {
      if (initialState.selectedTime) {
        setTimeState(prev => ({
          ...prev,
          selectedTime: initialState.selectedTime,
          referenceTime: initialState.selectedTime,
        }));
      }
      if (initialState.referenceTimezone) {
        setReferenceTimezone(initialState.referenceTimezone);
        setHasUserSetReference(true);
      }
      if (initialState.workspaceId) {
        const workspace = workspaces.find(w => w.id === initialState.workspaceId);
        if (workspace) {
          setActiveWorkspace(workspace);
        }
      }
    }
  }, [getInitialState, workspaces, setActiveWorkspace]);

  // Update URL when state changes
  useEffect(() => {
    updateUrl({
      selectedTime: timeState.selectedTime,
      referenceTimezone: hasUserSetReference ? referenceTimezone : undefined,
      workspaceId: activeWorkspace?.id,
    });
  }, [timeState.selectedTime, referenceTimezone, hasUserSetReference, activeWorkspace, updateUrl]);

  // Auto-detect timezone from geolocation or IP
  useEffect(() => {
    if (!hasUserSetReference) {
      if (location?.timezone) {
        const geoTimezone: TimezoneData = {
          id: location.timezone,
          name: location.timezone.replace('_', ' '),
          city: location.city || 'Your Location',
          country: location.country || '',
          offset: getTimezoneOffset(location.timezone),
        };
        setReferenceTimezone(geoTimezone);
      } else if (ipTimezone) {
        const ipTimezoneData: TimezoneData = {
          id: ipTimezone.timezone,
          name: ipTimezone.timezone.replace('_', ' '),
          city: ipTimezone.city || 'Your Location',
          country: ipTimezone.country || '',
          offset: getTimezoneOffset(ipTimezone.timezone),
        };
        setReferenceTimezone(ipTimezoneData);
      }
    }
  }, [location, ipTimezone, hasUserSetReference]);

  // Load timezones based on active workspace
  useEffect(() => {
    if (activeWorkspace) {
      const workspaceTimezones = getWorkspaceTimezones(activeWorkspace.id);
      setTimeState(prev => ({
        ...prev,
        timezones: workspaceTimezones,
      }));
    } else {
      // Load global timezones from localStorage
      const savedTimezones = localStorage.getItem('world-clock-timezones');
      if (savedTimezones) {
        try {
          const parsedTimezones = JSON.parse(savedTimezones);
          setTimeState(prev => ({
            ...prev,
            timezones: parsedTimezones,
          }));
        } catch (error) {
          console.error('Error parsing saved timezones:', error);
        }
      }
    }
  }, [activeWorkspace, getWorkspaceTimezones]);

  // Save timezones to localStorage when they change (only for global)
  useEffect(() => {
    if (!activeWorkspace) {
      localStorage.setItem('world-clock-timezones', JSON.stringify(timeState.timezones));
    }
  }, [timeState.timezones, activeWorkspace]);

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTimeState(prev => ({
        ...prev,
        selectedTime: now,
        referenceTime: now,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleTimeChange = useCallback((newTime: Date) => {
    setTimeState(prev => ({
      ...prev,
      selectedTime: newTime,
      referenceTime: newTime,
    }));
  }, []);

  const handleAddTimezone = useCallback((timezone: TimezoneData) => {
    if (activeWorkspace) {
      addTimezoneToWorkspace(activeWorkspace.id, timezone.id);
      const workspaceTimezones = getWorkspaceTimezones(activeWorkspace.id);
      setTimeState(prev => ({
        ...prev,
        timezones: [...workspaceTimezones, timezone],
      }));
    } else {
      setTimeState(prev => ({
        ...prev,
        timezones: [...prev.timezones, timezone],
      }));
    }
    setIsAddDialogOpen(false);
  }, [activeWorkspace, addTimezoneToWorkspace, getWorkspaceTimezones]);

  const handleRemoveTimezone = useCallback((timezoneId: string) => {
    if (activeWorkspace) {
      // Remove from workspace's timezone ID list
      removeTimezoneFromWorkspace(activeWorkspace.id, timezoneId);
      
      // Force a re-render
      setTimeState(prev => ({
        ...prev,
        timezones: prev.timezones.filter(tz => tz.id !== timezoneId),
      }));
    } else {
      setTimeState(prev => ({
        ...prev,
        timezones: prev.timezones.filter(tz => tz.id !== timezoneId),
      }));
    }
  }, [activeWorkspace, removeTimezoneFromWorkspace]);

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

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = timeState.timezones.findIndex(tz => tz.id === active.id);
      const newIndex = timeState.timezones.findIndex(tz => tz.id === over.id);
      
      const newTimezones = arrayMove(timeState.timezones, oldIndex, newIndex);
      
      setTimeState(prev => ({
        ...prev,
        timezones: newTimezones,
      }));

      if (activeWorkspace) {
        reorderWorkspaceTimezones(activeWorkspace.id, newTimezones.map(tz => tz.id));
      }
    }
  }, [timeState.timezones, activeWorkspace, reorderWorkspaceTimezones]);

  const handleCreateWorkspace = useCallback((name: string, description?: string) => {
    createWorkspace(name, description);
    setIsCreateWorkspaceOpen(false);
  }, [createWorkspace]);

  const timezoneCards = useMemo(() => {
    return timeState.timezones.map((timezone) => {
      const convertedTime = convertTime(
        timeState.selectedTime,
        referenceTimezone.offset,
        timezone.offset
      );

      return (
        <SortableTimezoneCard
          key={timezone.id}
          timezone={timezone}
          time={convertedTime}
          onRemove={handleRemoveTimezone}
          onSetAsReference={handleSetAsReference}
          isReference={false}
        />
      );
    });
  }, [timeState.timezones, timeState.selectedTime, referenceTimezone.offset, handleRemoveTimezone, handleSetAsReference]);

  const referenceCard = useMemo(() => {
    return (
      <TimezoneCard
        timezone={referenceTimezone}
        time={timeState.selectedTime}
        onRemove={() => {}}
        onSetAsReference={() => {}}
        isReference={true}
        showActions={false}
      />
    );
  }, [referenceTimezone, timeState.selectedTime]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Globe className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">World Clock</h1>
                  <p className="text-gray-600">Track time across different timezones</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <ShareButton 
                  selectedTime={timeState.selectedTime}
                  referenceTimezone={hasUserSetReference ? referenceTimezone : undefined}
                  workspaceId={activeWorkspace?.id}
                />
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Timezone
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
                <TabsTrigger value="clock" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Clock
                </TabsTrigger>
                <TabsTrigger value="workspaces" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Workspaces
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="clock" className="space-y-6">
                {/* Reference Timezone */}
                <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-blue-900">
                        <MapPin className="h-5 w-5" />
                        Reference Time
                      </CardTitle>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Primary
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {referenceCard}
                  </CardContent>
                </Card>

                {/* Time Selector */}
                <Card className="shadow-lg border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Time Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimeSelector
                      selectedTime={timeState.selectedTime}
                      onTimeChange={handleTimeChange}
                    />
                  </CardContent>
                </Card>

                {/* Timezone List */}
                {timeState.timezones.length > 0 && (
                  <Card className="shadow-lg border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Other Timezones
                        <Badge variant="outline" className="ml-2">
                          {timeState.timezones.length}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        modifiers={[restrictToVerticalAxis]}
                      >
                        <SortableContext
                          items={timeState.timezones.map(tz => tz.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-4">
                            {timezoneCards}
                          </div>
                        </SortableContext>
                      </DndContext>
                    </CardContent>
                  </Card>
                )}

                {timeState.timezones.length === 0 && (
                  <Card className="shadow-lg border-gray-200">
                    <CardContent className="text-center py-12">
                      <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No timezones added yet</h3>
                      <p className="text-gray-600 mb-6">Add your first timezone to start tracking time across different regions.</p>
                      <Button
                        onClick={() => setIsAddDialogOpen(true)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Timezone
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="workspaces" className="space-y-6">
                <Card className="shadow-lg border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Workspace Management
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setIsCreateWorkspaceOpen(true)}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create
                        </Button>
                        <Button
                          onClick={() => setIsManageWorkspacesOpen(true)}
                          variant="outline"
                          size="sm"
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <WorkspaceSelector
                      workspaces={workspaces}
                      activeWorkspace={activeWorkspace}
                      onWorkspaceChange={setActiveWorkspace}
                    />
                  </CardContent>
                </Card>

                {activeWorkspace && (
                  <Card className="shadow-lg border-gray-200">
                    <CardHeader>
                      <CardTitle>Workspace Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg">{activeWorkspace.name}</h3>
                          {activeWorkspace.description && (
                            <p className="text-gray-600">{activeWorkspace.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>Created: {new Date(activeWorkspace.createdAt).toLocaleDateString()}</span>
                          <span>Timezones: {timeState.timezones.length}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card className="shadow-lg border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Application Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-semibold mb-2">Current Reference Timezone</h3>
                        <p className="text-gray-600 mb-4">
                          {referenceTimezone.city}, {referenceTimezone.country || referenceTimezone.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {hasUserSetReference 
                            ? 'You have manually set this timezone as reference.'
                            : 'This timezone was automatically detected based on your location.'
                          }
                        </p>
                      </div>
                      
                      <div>
                        <h3 className="font-semibold mb-2">Data Storage</h3>
                        <p className="text-sm text-gray-500">
                          Your timezone preferences and workspaces are stored locally in your browser.
                          No data is sent to external servers.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddTimezoneDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddTimezone={handleAddTimezone}
        existingTimezones={[...timeState.timezones, referenceTimezone]}
      />

      <CreateWorkspaceDialog
        open={isCreateWorkspaceOpen}
        onOpenChange={setIsCreateWorkspaceOpen}
        onCreateWorkspace={handleCreateWorkspace}
      />

      <ManageWorkspacesDialog
        open={isManageWorkspacesOpen}
        onOpenChange={setIsManageWorkspacesOpen}
        workspaces={workspaces}
        onDeleteWorkspace={deleteWorkspace}
        onUpdateWorkspace={updateWorkspace}
      />
    </div>
  );
}