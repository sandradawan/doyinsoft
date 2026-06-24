import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config.dart';
import '../theme.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!Config.supabaseConfigured) {
      setState(() => _error = 'Auth not configured (set SUPABASE_URL / SUPABASE_ANON_KEY).');
      return;
    }
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your email and password.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = Supabase.instance.client.auth;
      if (_signUp) {
        await auth.signUp(
          email: _email.text.trim(),
          password: _password.text,
          data: _name.text.trim().isNotEmpty ? {'display_name': _name.text.trim()} : null,
        );
      } else {
        await auth.signInWithPassword(email: _email.text.trim(), password: _password.text);
      }
      if (mounted) Navigator.of(context).pop(true);
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final brand = context.brand;
    return Scaffold(
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo
                  Center(
                    child: Container(
                      width: 64,
                      height: 64,
                      padding: const EdgeInsets.all(14),
                      decoration: const BoxDecoration(color: Brand.emerald, shape: BoxShape.circle),
                      child: Image.asset('assets/splash.png'),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: Text.rich(TextSpan(children: [
                      const TextSpan(
                          text: 'Doyin',
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
                      TextSpan(
                          text: 'Mart',
                          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: brand.brand)),
                    ])),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Text(
                      _signUp ? 'Create your account' : 'Welcome back',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Center(
                    child: Text(
                      _signUp
                          ? 'Sign up to shop, save items and send gift cards.'
                          : 'Sign in to your purchases, gift cards and saved items.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: brand.inkSoft),
                    ),
                  ),
                  const SizedBox(height: 24),

                  if (_error != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                    ),

                  if (_signUp) ...[
                    TextField(
                      controller: _name,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Name',
                        hintText: 'Your name',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      hintText: 'you@example.com',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _password,
                    obscureText: _obscure,
                    onSubmitted: (_) => _submit(),
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _busy ? null : _submit,
                    style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                    child: Text(_busy ? 'Please wait…' : (_signUp ? 'Create account' : 'Sign in')),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: TextButton(
                      onPressed: () => setState(() {
                        _signUp = !_signUp;
                        _error = null;
                      }),
                      child: Text.rich(TextSpan(children: [
                        TextSpan(
                            text: _signUp ? 'Already have an account?  ' : 'New here?  ',
                            style: TextStyle(color: brand.inkSoft)),
                        TextSpan(
                            text: _signUp ? 'Sign in' : 'Create an account',
                            style: TextStyle(color: brand.brand, fontWeight: FontWeight.w600)),
                      ])),
                    ),
                  ),
                  if (_signUp)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(
                        'By creating an account you agree to our Terms and Privacy Policy.',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: brand.inkSoft),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
