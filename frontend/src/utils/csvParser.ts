import { Candidate, CsvCandidateRow } from '../types';

export const SAMPLE_VALID_CSV = `registrationNumber,fullName,email,phone,aadhaarLast4,assessmentScore,attendancePercent
PSM-2026-8801,Aarav Kulkarni,aarav.kulkarni@example.in,9823011201,4821,86,94
PSM-2026-8802,Bhavna Deshmukh,bhavna.deshmukh@example.in,9823011202,7390,91,96
PSM-2026-8803,Chetan Sawant,chetan.sawant@example.in,9823011203,1945,78,88
PSM-2026-8804,Deepali Joshi,deepali.joshi@example.in,9823011204,6032,84,92
PSM-2026-8805,Eshan Patwardhan,eshan.patwardhan@example.in,9823011205,5518,74,85
PSM-2026-8806,Falguni Nair,falguni.nair@example.in,9823011206,8274,89,95
PSM-2026-8807,Gaurav Shinde,gaurav.shinde@example.in,9823011207,3309,81,90
PSM-2026-8808,Harshada More,harshada.more@example.in,9823011208,9142,93,98`;

export const SAMPLE_WITH_ERRORS_CSV = `registrationNumber,fullName,email,phone,aadhaarLast4,assessmentScore,attendancePercent
PSM-2026-9101,Ishaan Verma,ishaan.verma@example.in,9823014401,4123,82,91
PSM-2026-9102,Janhavi Rao,janhavi.rao-invalid,98230,77,79,88
PSM-2026-9103,,kiran.patil@example.in,9823014403,6291,64,72
PSM-2026-9104,Lokesh Mane,lokesh.mane@example.in,9823014404,3348,108,95
PSM-2026-9105,Manasi Gokhale,manasi.gokhale@example.in,9823014405,9901,88,93
PSM-2026-9101,Nikhil Chavan,nikhil.chavan@example.in,9823014406,5543,76,84`;

export function parseCandidateCsv(rawCsv: string): CsvCandidateRow[] {
  const lines = rawCsv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const firstCells = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const hasHeader =
    firstCells.includes('fullname') ||
    firstCells.includes('registrationnumber') ||
    firstCells.includes('email');

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const seenRegNos = new Set<string>();
  const seenEmails = new Set<string>();

  return dataLines.map((line, index) => {
    const rowNumber = index + 1;
    const cols = line.split(',').map((c) => c.trim());
    const [
      registrationNumber = '',
      fullName = '',
      email = '',
      phone = '',
      aadhaarLast4 = '',
      assessmentScore = '',
      attendancePercent = '',
    ] = cols;

    const errors: string[] = [];

    if (!registrationNumber) {
      errors.push('Missing registration number');
    } else if (seenRegNos.has(registrationNumber.toUpperCase())) {
      errors.push(`Duplicate registration number (${registrationNumber})`);
    } else {
      seenRegNos.add(registrationNumber.toUpperCase());
    }

    if (!fullName || fullName.length < 2) {
      errors.push('Candidate full name is required');
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email address format');
    } else if (seenEmails.has(email.toLowerCase())) {
      errors.push('Duplicate email address');
    } else {
      seenEmails.add(email.toLowerCase());
    }

    if (!/^\d{10}$/.test(phone)) {
      errors.push('Phone must be a 10-digit mobile number');
    }

    if (!/^\d{4}$/.test(aadhaarLast4)) {
      errors.push('Aadhaar last 4 digits required');
    }

    const scoreNum = Number(assessmentScore);
    if (assessmentScore === '' || Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      errors.push('Assessment score must be between 0 and 100');
    } else if (scoreNum < 40) {
      errors.push('Score below minimum passing threshold (40%)');
    }

    const attNum = Number(attendancePercent);
    if (attendancePercent === '' || Number.isNaN(attNum) || attNum < 0 || attNum > 100) {
      errors.push('Attendance % must be between 0 and 100');
    } else if (attNum < 75) {
      errors.push('Attendance below 75% mission threshold');
    }

    return {
      rowNumber,
      registrationNumber,
      fullName,
      email,
      phone,
      aadhaarLast4,
      assessmentScore,
      attendancePercent,
      errors,
      isValid: errors.length === 0,
    };
  });
}

export function csvRowsToCandidates(rows: CsvCandidateRow[]): Candidate[] {
  return rows
    .filter((r) => r.isValid)
    .map((r, idx) => {
      const score = Number(r.assessmentScore);
      return {
        id: `cand-${Date.now()}-${idx}`,
        registrationNumber: r.registrationNumber,
        fullName: r.fullName,
        email: r.email,
        phone: `+91 ${r.phone}`,
        aadhaarMasked: `XXXX-XXXX-${r.aadhaarLast4}`,
        assessmentScore: score,
        attendancePercent: Number(r.attendancePercent),
        result: score >= 85 ? 'Distinction' : 'Pass',
      };
    });
}
