const Interview = require('../models/Interview');
const Application = require('../models/Application');

const generateInterviewId = async () => {
  const last = await Interview.findOne().sort({ createdAt: -1 }).select('interviewId');
  if (last?.interviewId) {
    const num = parseInt(last.interviewId.replace('INT', '')) || 300;
    return `INT${num + 1}`;
  }
  return 'INT301';
};

// POST /interviews  — Schedule an interview
const scheduleInterview = async (req, res) => {
  try {
    const { application: appId, interviewer, round, interviewDate } = req.body;
    if (!appId) return res.status(400).json({ success: false, message: 'application is required' });

    // Application must exist
    const application = await Application.findById(appId);
    if (!application) return res.status(404).json({ success: false, message: 'Application not found' });

    // Workflow Rule 1: Rejected application cannot receive interview
    if (application.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Rejected application cannot receive interview' });
    }

    // Interview date must be valid
    if (interviewDate && isNaN(new Date(interviewDate).getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid interview date' });
    }

    const interviewId = await generateInterviewId();
    const interview = await Interview.create({
      interviewId,
      application: appId,
      interviewer: interviewer || '',
      round: round || '',
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
      status: 'scheduled',
      result: 'pending'
    });

    const populated = await Interview.findById(interview._id).populate({
      path: 'application',
      populate: [
        { path: 'student', select: 'studentId name' },
        { path: 'drive', populate: { path: 'company', select: 'companyId name' }, select: 'driveId title company' }
      ]
    });

    res.status(201).json({ success: true, message: 'Interview scheduled successfully', data: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /interviews/:id  — Update interview result
const updateInterview = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).populate({
      path: 'application',
      populate: [
        { path: 'student', select: 'studentId name' },
        { path: 'drive', populate: { path: 'company', select: 'companyId name' }, select: 'driveId title company' }
      ]
    });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    const application = await Application.findById(interview.application._id);

    // Workflow Rule 1: Rejected application cannot receive interview
    if (application.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Rejected application cannot receive interview' });
    }

    // Workflow Rule 2: Selected candidates cannot be rescheduled
    if (application.status === 'selected' && req.body.interviewDate) {
      return res.status(400).json({ success: false, message: 'Selected candidate cannot be rescheduled' });
    }

    const { result, feedback, status, interviewDate, interviewer, round } = req.body;
    if (result !== undefined)        interview.result = result;
    if (feedback !== undefined)      interview.feedback = feedback;
    if (status !== undefined)        interview.status = status;
    if (interviewDate !== undefined) interview.interviewDate = new Date(interviewDate);
    if (interviewer !== undefined)   interview.interviewer = interviewer;
    if (round !== undefined)         interview.round = round;

    await interview.save();

    const updated = await Interview.findById(interview._id).populate({
      path: 'application',
      populate: [
        { path: 'student', select: 'studentId name' },
        { path: 'drive', populate: { path: 'company', select: 'companyId name' }, select: 'driveId title company' }
      ]
    });

    res.status(200).json({ success: true, message: 'Interview updated successfully', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /interviews
const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find()
      .populate({
        path: 'application',
        populate: [
          { path: 'student', select: 'studentId name department' },
          { path: 'drive', populate: { path: 'company', select: 'companyId name' }, select: 'driveId title company' }
        ]
      })
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, message: 'Interviews fetched successfully', total: interviews.length, data: interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { scheduleInterview, updateInterview, getInterviews };
