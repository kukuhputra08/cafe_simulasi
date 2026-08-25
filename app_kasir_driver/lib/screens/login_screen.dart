import 'package:flutter/material.dart';
import 'cashier/cashier_home_screen.dart';
import 'driver/driver_home_screen.dart';
import '../main.dart';

class LoginScreen extends StatefulWidget {
  final String role; // 'kasir' atau 'driver'
  const LoginScreen({super.key, required this.role});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  bool loading = false;
  String? errorMsg;

  Future<void> handleLogin() async {
    setState(() {
      loading = true;
      errorMsg = null;
    });

    try {
      final res = await supabase.auth.signInWithPassword(
        email: emailController.text.trim(),
        password: passwordController.text,
      );

      final userId = res.user?.id;
      if (userId == null) throw Exception('Login gagal');

      // cek role di tabel profiles, harus sesuai sama role yang dipilih
      final profile = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

      if (profile['role'] != widget.role) {
        await supabase.auth.signOut();
        setState(() {
          errorMsg = 'Akun ini bukan akun ${widget.role}';
          loading = false;
        });
        return;
      }

      if (!mounted) return;
      if (widget.role == 'kasir') {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const CashierHomeScreen()),
        );
      } else {
        Navigator.pushReplacement(context,
          MaterialPageRoute(builder: (_) => const DriverHomeScreen())
        );
      }
    } catch (e) {
      setState(() {
        errorMsg = 'Login gagal: ${e.toString()}';
      });
    } finally {
      setState(() {
        loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Login ${widget.role == 'kasir' ? 'Kasir' : 'Driver'}'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: emailController,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: passwordController,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            const SizedBox(height: 24),
            if (errorMsg != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(
                  errorMsg!,
                  style: const TextStyle(color: Colors.red),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: loading ? null : handleLogin,
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: loading
                      ? const CircularProgressIndicator()
                      : const Text('Login'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
