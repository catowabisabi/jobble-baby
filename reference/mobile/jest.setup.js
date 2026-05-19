import '@testing-library/jest-native/extend-expect';

const mockJobs: any[] = [];
const mockCompanies: any[] = [];
let mockJobId = 1;
let mockCompanyId = 1;

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    getAllAsync: jest.fn((sql) => {
      if (sql.includes('FROM jobs') && sql.includes('GROUP BY c.id')) {
        return Promise.resolve([]);
      }
      if (sql.includes('FROM jobs')) {
        return Promise.resolve(mockJobs);
      }
      if (sql.includes('FROM companies')) {
        return Promise.resolve(mockCompanies);
      }
      return Promise.resolve([]);
    }),
    getFirstAsync: jest.fn((sql, params) => {
      if (sql.includes('WHERE j.id = ?')) {
        const job = mockJobs.find((j) => j.id === params[0]);
        return Promise.resolve(job || null);
      }
      if (sql.includes('WHERE c.id = ?')) {
        const company = mockCompanies.find((c) => c.id === params[0]);
        return Promise.resolve(company || null);
      }
      if (sql.includes('SUM') && sql.includes('FROM jobs')) {
        return Promise.resolve({
          total: mockJobs.length,
          new: mockJobs.filter((j) => j.status === 'new').length,
          applied: mockJobs.filter((j) => j.status === 'applied').length,
          interviewing: mockJobs.filter((j) => j.status === 'interviewing').length,
          offered: mockJobs.filter((j) => j.status === 'offered').length,
          favorite: mockJobs.filter((j) => j.is_favorite === 1).length,
        });
      }
      return Promise.resolve(null);
    }),
    runAsync: jest.fn((sql, params = []) => {
      if (sql.includes('INSERT INTO jobs')) {
        const id = mockJobId++;
        mockJobs.push({
          id,
          title: params[0],
          description: params[1],
          company_id: params[2],
          company_name: params[3],
          location: params[4],
          url: params[5],
          salary_min: params[6],
          salary_max: params[7],
          salary_currency: params[8],
          salary_period: params[9],
          status: params[10],
          is_favorite: params[11],
          notes: params[12],
          ai_analysis: params[13],
          ai_match_score: params[14],
          scraped_at: params[15],
          content_hash: params[16],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return Promise.resolve({ lastInsertRowId: id, changes: 1 });
      }
      if (sql.includes('UPDATE jobs')) {
        const id = params[params.length - 1];
        const job = mockJobs.find((j) => j.id === id);
        if (job) {
          if (sql.includes('status = ?')) {
            const statusIndex = params.findIndex((p) => ['new', 'viewed', 'applied', 'interviewing', 'offered', 'rejected', 'archived'].includes(p));
            if (statusIndex > -1) job.status = params[statusIndex];
          }
          if (sql.includes('is_favorite = ?')) {
            const favIndex = params.findIndex((p) => p === 0 || p === 1);
            if (favIndex > -1) job.is_favorite = params[favIndex];
          }
        }
        return Promise.resolve({ changes: 1 });
      }
      if (sql.includes('DELETE FROM jobs')) {
        if (params.length === 0) {
          mockJobs.length = 0;
        } else {
          const id = params[0];
          const index = mockJobs.findIndex((j) => j.id === id);
          if (index > -1) {
            mockJobs.splice(index, 1);
          }
        }
        return Promise.resolve({ changes: 1 });
      }
      if (sql.includes('INSERT INTO companies')) {
        const id = mockCompanyId++;
        mockCompanies.push({
          id,
          name: params[0],
          url: params[1],
          active: params[2],
          created_at: new Date().toISOString(),
        });
        return Promise.resolve({ lastInsertRowId: id, changes: 1 });
      }
      if (sql.includes('UPDATE companies')) {
        const id = params[params.length - 1];
        const company = mockCompanies.find((c) => c.id === id);
        if (company) {
          if (sql.includes('active = ?')) {
            const activeIndex = params.findIndex((p) => p === 0 || p === 1);
            if (activeIndex > -1) company.active = params[activeIndex];
          }
        }
        return Promise.resolve({ changes: 1 });
      }
      if (sql.includes('DELETE FROM companies')) {
        if (params.length === 0) {
          mockCompanies.length = 0;
        } else {
          const id = params[0];
          const index = mockCompanies.findIndex((c) => c.id === id);
          if (index > -1) {
            mockCompanies.splice(index, 1);
          }
        }
        return Promise.resolve({ changes: 1 });
      }
      return Promise.resolve({ changes: 0 });
    }),
    closeAsync: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-vector-icons', () => ({
  default: 'Icon',
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: 'LineChart',
  PieChart: 'PieChart',
}));
