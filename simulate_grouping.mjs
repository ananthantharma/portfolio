import React from 'react';

function simulateGrouping(accessLogs) {
  const groups = {};
  accessLogs.forEach(log => {
      if (!groups[log.ip]) {
        groups[log.ip] = [];
      }
      groups[log.ip].push(log);
  });

  return Object.entries(groups)
    .map(([ip, logs]) => {
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return {
        ip,
        logs,
        lastActive: logs[0].timestamp,
        user: logs.find(l => l.userEmail)?.userEmail || 'Guest',
        totalVisits: logs.length,
      };
    })
    .sort((a, b) => {
      const timeA = new Date(a.lastActive).getTime();
      const timeB = new Date(b.lastActive).getTime();
      return timeB - timeA;
    });
}

const mockLogs = [
  { ip: '192.168.1.1', timestamp: '2023-10-01T10:00:00.000Z', path: '/foo' }
];

console.log(simulateGrouping(mockLogs));
