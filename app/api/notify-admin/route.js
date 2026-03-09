import { NextResponse } from 'next/server'

export async function POST(request) {
    try {
        const data = await request.json()

        // In a real application, you would use Resend, SendGrid, or Nodemailer here.
        // Example using Resend (you need to install 'resend' and configure RESEND_API_KEY):
        /*
        import { Resend } from 'resend'
        const resend = new Resend(process.env.RESEND_API_KEY)
        
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: process.env.ADMIN_EMAIL,
          subject: '새로운 OPHWS 가입 신청이 도착했습니다.',
          html: `<p><strong>이름:</strong> ${data.name}</p>...`
        })
        */

        console.log("========================================")
        console.log("🚨 ADMIN NOTIFICATION (MOCK EMAIL SENT) 🚨")
        console.log("새로운 가입 신청자 정보:")
        console.log(`이름: ${data.name}`)
        console.log(`소속: ${data.department}`)
        console.log(`사번: ${data.employee_id || '없음'}`)
        console.log(`메모: ${data.memo || '없음'}`)
        console.log("========================================")

        return NextResponse.json({ success: true, message: 'Admin notified mock correctly' })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to notify admin' }, { status: 500 })
    }
}
