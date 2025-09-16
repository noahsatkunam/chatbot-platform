import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  Tabs,
  Tab,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Gavel as ComplianceIcon,
  Assignment as AuditIcon,
  VpnKey as KeyIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Settings as SettingsIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

interface SecurityViolation {
  id: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  nodeId?: string;
  nodeName?: string;
  recommendation: string;
  timestamp: Date;
}

interface SecurityScan {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'scanning' | 'completed' | 'failed';
  riskLevel: 'low' | 'medium' | 'high';
  violations: SecurityViolation[];
  scanDate: Date;
  scanDuration: number;
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
  lastUpdated: Date;
}

interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  success: boolean;
  ipAddress: string;
  userAgent: string;
  details?: any;
}

interface UserPermission {
  userId: string;
  userName: string;
  email: string;
  role: string;
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canExecute: boolean;
    canDelete: boolean;
    canShare: boolean;
  };
  lastAccess?: Date;
}

const riskLevelColors = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336'
};

const severityIcons = {
  low: CheckCircleIcon,
  medium: WarningIcon,
  high: ErrorIcon,
  critical: ErrorIcon
};

export const WorkflowSecurity: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [securityScans, setSecurityScans] = useState<SecurityScan[]>([]);
  const [complianceRules, setComplianceRules] = useState<ComplianceRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      const mockScans: SecurityScan[] = [
        {
          id: '1',
          workflowId: 'wf-1',
          workflowName: 'User Registration Flow',
          status: 'completed',
          riskLevel: 'medium',
          violations: [
            {
              id: 'v1',
              type: 'warning',
              severity: 'medium',
              title: 'External API Call',
              description: 'Workflow makes calls to external APIs without proper validation',
              nodeId: 'node-1',
              nodeName: 'HTTP Request',
              recommendation: 'Add input validation and rate limiting',
              timestamp: new Date()
            }
          ],
          scanDate: new Date(),
          scanDuration: 2500
        },
        {
          id: '2',
          workflowId: 'wf-2',
          workflowName: 'Data Processing Pipeline',
          status: 'completed',
          riskLevel: 'high',
          violations: [
            {
              id: 'v2',
              type: 'error',
              severity: 'high',
              title: 'SQL Injection Risk',
              description: 'Dynamic SQL query construction detected',
              nodeId: 'node-2',
              nodeName: 'Database Query',
              recommendation: 'Use parameterized queries',
              timestamp: new Date()
            }
          ],
          scanDate: new Date(),
          scanDuration: 3200
        }
      ];

      const mockRules: ComplianceRule[] = [
        {
          id: '1',
          name: 'No External API Calls',
          description: 'Prevent workflows from making calls to external APIs',
          category: 'Data Protection',
          severity: 'medium',
          enabled: true,
          lastUpdated: new Date()
        },
        {
          id: '2',
          name: 'SQL Injection Prevention',
          description: 'Detect and prevent SQL injection vulnerabilities',
          category: 'Security',
          severity: 'high',
          enabled: true,
          lastUpdated: new Date()
        },
        {
          id: '3',
          name: 'PII Data Handling',
          description: 'Ensure proper handling of personally identifiable information',
          category: 'Privacy',
          severity: 'high',
          enabled: true,
          lastUpdated: new Date()
        }
      ];

      const mockAuditLogs: AuditLog[] = [
        {
          id: '1',
          timestamp: new Date(),
          userId: 'user-1',
          userName: 'John Doe',
          action: 'workflow_execute',
          resource: 'workflow',
          resourceId: 'wf-1',
          success: true,
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 300000),
          userId: 'user-2',
          userName: 'Jane Smith',
          action: 'workflow_edit',
          resource: 'workflow',
          resourceId: 'wf-2',
          success: true,
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0...'
        }
      ];

      const mockPermissions: UserPermission[] = [
        {
          userId: 'user-1',
          userName: 'John Doe',
          email: 'john@company.com',
          role: 'Admin',
          permissions: {
            canRead: true,
            canWrite: true,
            canExecute: true,
            canDelete: true,
            canShare: true
          },
          lastAccess: new Date()
        },
        {
          userId: 'user-2',
          userName: 'Jane Smith',
          email: 'jane@company.com',
          role: 'Editor',
          permissions: {
            canRead: true,
            canWrite: true,
            canExecute: true,
            canDelete: false,
            canShare: false
          },
          lastAccess: new Date(Date.now() - 3600000)
        }
      ];

      setSecurityScans(mockScans);
      setComplianceRules(mockRules);
      setAuditLogs(mockAuditLogs);
      setUserPermissions(mockPermissions);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSecurityScan = async (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    setScanDialogOpen(true);
    setScanProgress(0);
    setLoading(true);

    // Simulate scan progress
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setLoading(false);
          setScanDialogOpen(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleToggleComplianceRule = async (ruleId: string, enabled: boolean) => {
    setComplianceRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled } : rule
    ));
  };

  const handleEditUserPermissions = (user: UserPermission) => {
    setSelectedUser(user);
    setPermissionDialogOpen(true);
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUser) return;

    setUserPermissions(prev => prev.map(user => 
      user.userId === selectedUser.userId ? selectedUser : user
    ));
    setPermissionDialogOpen(false);
    setSelectedUser(null);
  };

  const renderSecurityScanCard = (scan: SecurityScan) => {
    const riskColor = riskLevelColors[scan.riskLevel];
    
    return (
      <Card key={scan.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
            <Box>
              <Typography variant="h6">{scan.workflowName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Scanned {scan.scanDate.toLocaleString()}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip
                label={scan.riskLevel.toUpperCase()}
                sx={{ bgcolor: riskColor, color: 'white' }}
                size="small"
              />
              <Chip
                label={scan.status}
                color={scan.status === 'completed' ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          <Box display="flex" alignItems="center" mb={2}>
            <SecurityIcon sx={{ mr: 1, color: riskColor }} />
            <Typography variant="body2">
              {scan.violations.length} security issues found
            </Typography>
          </Box>

          {scan.violations.length > 0 && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Security Violations</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List dense>
                  {scan.violations.map((violation) => {
                    const SeverityIcon = severityIcons[violation.severity];
                    return (
                      <ListItem key={violation.id}>
                        <SeverityIcon 
                          sx={{ 
                            mr: 2, 
                            color: violation.type === 'error' ? 'error.main' : 'warning.main' 
                          }} 
                        />
                        <ListItemText
                          primary={violation.title}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {violation.description}
                              </Typography>
                              <Typography variant="caption" color="primary">
                                Recommendation: {violation.recommendation}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          <Box display="flex" gap={1} mt={2}>
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => handleRunSecurityScan(scan.workflowId)}
            >
              Re-scan
            </Button>
            <Button
              size="small"
              startIcon={<DownloadIcon />}
            >
              Export Report
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const renderComplianceRuleCard = (rule: ComplianceRule) => {
    return (
      <Card key={rule.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="start">
            <Box flex={1}>
              <Typography variant="h6">{rule.name}</Typography>
              <Typography variant="body2" color="text.secondary" mb={1}>
                {rule.description}
              </Typography>
              <Box display="flex" gap={1}>
                <Chip label={rule.category} size="small" variant="outlined" />
                <Chip 
                  label={rule.severity.toUpperCase()} 
                  size="small" 
                  color={rule.severity === 'high' ? 'error' : rule.severity === 'medium' ? 'warning' : 'default'}
                />
              </Box>
            </Box>
            <Switch
              checked={rule.enabled}
              onChange={(e) => handleToggleComplianceRule(rule.id, e.target.checked)}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Workflow Security & Compliance</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadSecurityData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<SecurityIcon />}
            onClick={() => handleRunSecurityScan('all')}
          >
            Run Security Scan
          </Button>
        </Box>
      </Box>

      <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Security Scans" icon={<SecurityIcon />} />
        <Tab label="Compliance Rules" icon={<ComplianceIcon />} />
        <Tab label="User Permissions" icon={<PersonIcon />} />
        <Tab label="Audit Logs" icon={<AuditIcon />} />
      </Tabs>

      {selectedTab === 0 && (
        <Box>
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ShieldIcon sx={{ mr: 1, color: 'success.main' }} />
                    <Typography variant="h6">Low Risk</Typography>
                  </Box>
                  <Typography variant="h4" color="success.main">
                    {securityScans.filter(s => s.riskLevel === 'low').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                    <Typography variant="h6">Medium Risk</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {securityScans.filter(s => s.riskLevel === 'medium').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />
                    <Typography variant="h6">High Risk</Typography>
                  </Box>
                  <Typography variant="h4" color="error.main">
                    {securityScans.filter(s => s.riskLevel === 'high').length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6">Total Scans</Typography>
                  </Box>
                  <Typography variant="h4" color="primary.main">
                    {securityScans.length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {securityScans.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SecurityIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No security scans available
              </Typography>
              <Typography color="text.secondary" mb={3}>
                Run your first security scan to identify potential vulnerabilities
              </Typography>
              <Button variant="contained" onClick={() => handleRunSecurityScan('all')}>
                Run Security Scan
              </Button>
            </Paper>
          ) : (
            <Box>
              {securityScans.map(renderSecurityScanCard)}
            </Box>
          )}
        </Box>
      )}

      {selectedTab === 1 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">Compliance Rules</Typography>
            <Button variant="contained" startIcon={<SettingsIcon />}>
              Configure Rules
            </Button>
          </Box>

          {complianceRules.map(renderComplianceRuleCard)}
        </Box>
      )}

      {selectedTab === 2 && (
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h6">User Permissions</Typography>
            <Button variant="contained" startIcon={<PersonIcon />}>
              Add User
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Last Access</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userPermissions.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{user.userName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role} 
                        size="small" 
                        color={user.role === 'Admin' ? 'primary' : 'default'}
                        icon={user.role === 'Admin' ? <AdminIcon /> : <PersonIcon />}
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {user.permissions.canRead && <Chip label="Read" size="small" />}
                        {user.permissions.canWrite && <Chip label="Write" size="small" />}
                        {user.permissions.canExecute && <Chip label="Execute" size="small" />}
                        {user.permissions.canDelete && <Chip label="Delete" size="small" />}
                        {user.permissions.canShare && <Chip label="Share" size="small" />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {user.lastAccess ? user.lastAccess.toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => handleEditUserPermissions(user)}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {selectedTab === 3 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Audit Logs
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{log.timestamp.toLocaleString()}</TableCell>
                    <TableCell>{log.userName}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.resource}:{log.resourceId}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.success ? 'Success' : 'Failed'}
                        color={log.success ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{log.ipAddress}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Security Scan Dialog */}
      <Dialog open={scanDialogOpen} onClose={() => setScanDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Running Security Scan</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Scanning workflow for security vulnerabilities...
            </Typography>
            <LinearProgress variant="determinate" value={scanProgress} sx={{ mt: 2 }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {scanProgress}% complete
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* User Permissions Dialog */}
      <Dialog open={permissionDialogOpen} onClose={() => setPermissionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit User Permissions</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedUser.userName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedUser.email}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Permissions
              </Typography>

              <Box display="flex" flexDirection="column" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedUser.permissions.canRead}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, canRead: e.target.checked }
                      })}
                    />
                  }
                  label="Read workflows"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedUser.permissions.canWrite}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, canWrite: e.target.checked }
                      })}
                    />
                  }
                  label="Create and edit workflows"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedUser.permissions.canExecute}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, canExecute: e.target.checked }
                      })}
                    />
                  }
                  label="Execute workflows"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedUser.permissions.canDelete}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, canDelete: e.target.checked }
                      })}
                    />
                  }
                  label="Delete workflows"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedUser.permissions.canShare}
                      onChange={(e) => setSelectedUser({
                        ...selectedUser,
                        permissions: { ...selectedUser.permissions, canShare: e.target.checked }
                      })}
                    />
                  }
                  label="Share workflows"
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveUserPermissions} variant="contained">
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowSecurity;
