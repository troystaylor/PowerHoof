/**
 * Kill Port Script
 * 
 * Terminates any process using port 3000 before server startup.
 * This helps prevent EADDRINUSE errors when restarting the server.
 */

import { execSync } from 'child_process';
import { platform } from 'os';

const PORT = process.env.PORT || 3000;

function killPort(port) {
  const isWindows = platform() === 'win32';
  
  try {
    if (isWindows) {
      // Windows: Find and kill processes on the port
      const result = execSync(`netstat -ano | findstr :${port}`, { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Parse PIDs from netstat output
      const lines = result.trim().split('\n');
      const pids = new Set();
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
          pids.add(pid);
        }
      }
      
      // Kill each unique PID
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe' });
          console.log(`Killed process ${pid} on port ${port}`);
        } catch {
          // Process may have already exited
        }
      }
    } else {
      // Unix/Mac: Use lsof and kill
      try {
        const result = execSync(`lsof -ti:${port}`, { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        const pids = result.trim().split('\n').filter(Boolean);
        
        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
            console.log(`Killed process ${pid} on port ${port}`);
          } catch {
            // Process may have already exited
          }
        }
      } catch {
        // No process found on port
      }
    }
    
    console.log(`Port ${port} is now available`);
    
  } catch (error) {
    // No process found on port - this is fine
    console.log(`Port ${port} is available (no existing process found)`);
  }
}

killPort(PORT);
